import {
  ALL_POINTS,
  Known,
  stringFromKnownSet,
  UNKNOWN,
  valueFromString,
} from "./basics";
import { BOARD, Cell, Group } from "./board";
import { WritableState } from "./state";

import {
  deepCloneMap,
  deepCloneMapOfSets,
  shuffle,
} from "../utils/collections";

const LOG = false;

/**
 * Tracks determined knowns for a set of cells.
 */
export class SolvedKnowns {
  knowns = new Map<Cell, Known>();

  isEmpty(): boolean {
    return this.knowns.size === 0;
  }

  get size(): number {
    return this.knowns.size;
  }

  forEach(callback: (cell: Cell, Known: Known) => void): void {
    this.knowns.forEach((known: Known, cell: Cell) => callback(cell, known));
  }

  ordered(): [Cell, Known][] {
    return [...this.knowns.entries()];
  }

  randomized(): [Cell, Known][] {
    return shuffle(this.ordered());
  }

  add(cell: Cell, known: Known): boolean {
    const current = this.knowns.get(cell);
    if (known === current) {
      LOG && console.log("SOLVE set", cell.toString(), "=>", known, "DUPE");
      return false;
    } else if (current) {
      LOG &&
        console.log(
          "SOLVE set",
          cell.toString(),
          "=>",
          known,
          "x",
          current,
          "INVALID"
        );
    } else {
      LOG && console.log("SOLVE set", cell.toString(), "=>", known);
    }

    this.knowns.set(cell, known);
    return true;
  }

  remove(cell: Cell): boolean {
    if (!this.knowns.has(cell)) {
      return false;
    }

    // LOG && console.log("REMOVE SOLVED", cell.toString(), "=>", this.solutions.get(cell));
    this.knowns.delete(cell);
    return true;
  }
}

/**
 * Tracks knowns to remove from cells.
 */
export class ErasedPencils {
  pencils = new Map<Cell, Set<Known>>();

  isEmpty(): boolean {
    for (const [_, knowns] of this.pencils) {
      if (knowns.size > 0) {
        return false;
      }
    }

    return true;
  }

  forEach(callback: (cell: Cell, Known: Known) => void): void {
    this.pencils.forEach((knowns, cell) =>
      knowns.forEach((known) => callback(cell, known))
    );
  }

  ordered(): [Cell, Known][] {
    return [...this.pencils.entries()].flatMap(([cell, knowns]) =>
      [...knowns].map((known) => [cell, known])
    ) as [Cell, Known][];
  }

  randomized(): [Cell, Known][] {
    return shuffle(this.ordered());
  }

  add(cell: Cell, known: Known): boolean {
    const current = this.pencils.get(cell);
    if (!current) {
      LOG && console.log("SOLVE pencil", cell.toString(), "x", known);
      this.pencils.set(cell, new Set([known]));
    } else if (current.has(known)) {
      LOG && console.log("SOLVE pencil", cell.toString(), "x", known, "DUPE");
      return false;
    } else {
      LOG && console.log("SOLVE pencil", cell.toString(), "x", known);
      this.pencils.get(cell)!.add(known);
    }

    return true;
  }

  remove(cell: Cell, known: Known): boolean {
    if (!this.pencils.has(cell)) {
      return false;
    }

    // LOG && console.log("REMOVE SOLVED", cell.toString(), "=>", this.solutions.get(cell));
    return this.pencils.get(cell)!.delete(known);
  }
}

/**
 * Tracks determined knowns for a set of cells.
 */
export class Solutions {
  readonly knowns = new SolvedKnowns();
  readonly pencils = new ErasedPencils();

  isEmpty(): boolean {
    return this.knowns.isEmpty() && this.pencils.isEmpty();
  }

  forEachSolvedKnown(callback: (cell: Cell, Known: Known) => void): void {
    this.knowns.forEach(callback);
  }

  orderedSolvedKnowns(): [Cell, Known][] {
    return this.knowns.ordered();
  }

  randomizedSolvedKnowns(): [Cell, Known][] {
    return this.knowns.randomized();
  }

  addSolvedKnown(cell: Cell, known: Known): boolean {
    return this.knowns.add(cell, known);
  }

  removeSolvedKnown(cell: Cell): boolean {
    return this.knowns.remove(cell);
  }

  forEachErasedPencil(callback: (cell: Cell, Known: Known) => void): void {
    this.pencils.forEach(callback);
  }

  orderedErasedPencils(): [Cell, Known][] {
    return this.pencils.ordered();
  }

  randomizedErasedPencils(): [Cell, Known][] {
    return this.pencils.randomized();
  }

  addErasedPencil(cell: Cell, known: Known): boolean {
    return this.pencils.add(cell, known);
  }

  removeErasedPencil(cell: Cell, known: Known): boolean {
    return this.pencils.remove(cell, known);
  }
}

/**
 * Parses solutions from a partial or full puzzle string.
 *
 * Each row should contain the values for each cell, a digit for a solved cell
 * and any character (typically a period) for an unknown cell.
 * Rows may optionally be separated by any single character (typically a space).
 *
 * For example:
 *
 * "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68.."
 */
export function solutionsFromString(values: string): Solutions {
  if (![81, 89].includes(values.length)) {
    throw new Error(
      `Puzzle string length ${values.length} must be 81 or 89 characters`
    );
  }

  const solutions = new Solutions();
  const width = values.length === 81 ? 9 : 10;

  for (const p of ALL_POINTS) {
    const value = valueFromString(values.charAt(width * p.r + p.c));
    if (value !== UNKNOWN) {
      solutions.addSolvedKnown(BOARD.getCell(p), value);
    }
  }

  return solutions;
}

// how to support clearing knowns and adding candidates

export enum Strategy {
  ManualSetValue, // cell, known -> set cell to known
  ManualRemoveCandidate, // cell, value -> remove candidate from cell

  NakedSingle, // cell, candidate -> set cell to candidate; remove candidate from neighbors
  HiddenSingle, // cell, candidate, group(s) -> set cell to candidate

  PointingPair, // cells, candidate, intersection (follows from cells) -> cells; remove candidate from cells
  PointingTriple, // same ^
  BoxLineReduction, // same ^ in other direction

  NakedPair, // 2 cells, 2 candidates, 1 group -> cells; remove both candidates from other cells in group
  NakedTriple, // same ^ but with 3 cells and candidates
  HiddenPair, // 2 cells, 2 candidates, 1 group -> remove other candidates from the cells
  HiddenTriple, // same ^ but with 3 cells and candidates

  XWing, // 4 cells, 1 candidate; 1 direction (row or column) -> cells; remove candidate from other cells in given direction
  SinglesChain, // cells, 1 candidate -> cells; remove candidate from cells

  BruteForce, // cell, candidate -> set cell to candidate
}

/**
 * Captures the strategy, clues (knowns and candidates), and the resulting changes
 * to make to the board as a result.
 *
 * Captures the player's moves as well to create a uniform interface.
 */
export class Move {
  readonly strategy: Strategy;
  readonly groups = new Set<Group>();
  readonly clues = new Map<Cell, Set<Known>>();

  readonly sets = new Map<Cell, Known>();
  readonly marks = new Map<Cell, Set<Known>>();

  constructor(clone: Strategy | Move) {
    if (clone instanceof Move) {
      this.strategy = clone.strategy;
      this.groups = new Set(clone.groups);
      this.clues = deepCloneMapOfSets(clone.clues);
      this.sets = new Map(clone.sets);
      this.marks = deepCloneMapOfSets(clone.marks);
    } else {
      this.strategy = clone;
      this.groups = new Set<Group>();
      this.clues = new Map<Cell, Set<Known>>();
      this.sets = new Map<Cell, Known>();
      this.marks = new Map<Cell, Set<Known>>();
    }
  }

  group(group: Group): Move {
    this.groups.add(group);

    return this;
  }

  clue(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        if (this.clues.has(cell)) {
          // console.log("add", cell.point.k, known);
          this.clues.get(cell)!.add(known);
        } else {
          // console.log("set", cell.point.k, known);
          this.clues.set(cell, new Set([known]));
        }
      }
    );
  }

  set(cell: Cell, known: Known): Move {
    this.sets.set(cell, known);

    return this;
  }

  mark(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        if (this.marks.has(cell)) {
          // console.log("add", cell.point.k, known);
          this.marks.get(cell)!.add(known);
        } else {
          // console.log("set", cell.point.k, known);
          this.marks.set(cell, new Set([known]));
        }
      }
    );
  }

  private applyToCellsAndKnowns(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>,
    apply: (c: Cell, k: Known) => void
  ): Move {
    // console.log("apply", cells, knowns);
    if (isIterable(cells)) {
      if (isIterable(knowns)) {
        for (const c of cells as Iterable<Cell>) {
          for (const k of knowns as Iterable<Known>) {
            apply(c, k);
          }
        }
      } else {
        for (const c of cells as Iterable<Cell>) {
          apply(c, knowns as Known);
        }
      }
    } else {
      if (isIterable(knowns)) {
        for (const k of knowns as Iterable<Known>) {
          apply(cells as Cell, k);
        }
      } else {
        apply(cells as Cell, knowns as Known);
      }
    }

    return this;
  }

  isEmpty(): boolean {
    return this.sets.size === 0 && this.marks.size === 0;
  }

  // TODO Make this pretty or remove all solver logging in favor of showing in UI
  log() {
    console.info(
      "SOLVE",
      Strategy[this.strategy],
      "groups",
      this.groups,
      "clues",
      this.clues,
      "sets",
      this.sets,
      "marks",
      this.marks
    );
  }

  // FACTOR Move to WritableState, treating this as a pure data holder?
  apply(state: WritableState) {
    for (const [cell, known] of this.sets) {
      if (!state.isSolved(cell) && state.isCandidate(cell, known)) {
        state.setKnown(cell, known);
      }
    }

    for (const [cell, candidates] of this.marks) {
      if (!state.isSolved(cell)) {
        for (const candidate of candidates) {
          if (state.isCandidate(cell, candidate)) {
            state.removeCandidate(cell, candidate);
          }
        }
      }
    }
  }

  // highlight on hover over solver and history buttons
  // - list of cell/known-set tuples used to detect the solution
  // - list of cell/value tuples being set
  // - list of cell/known-set tuples of candidates to mark
}

function isIterable<T>(t: T | Iterable<T> | IterableIterator<T>): boolean {
  return typeof t === "object" && Symbol.iterator in t;
}
