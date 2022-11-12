import { ALL_POINTS, Known, UNKNOWN, valueFromString } from "./basics";
import { WritableBoard } from "./board";
import {
  Borders,
  CellColor,
  Decoration,
  FULL_BORDERS,
  MarkColor,
  NO_BORDERS,
} from "./decoration";
import { Cell, GRID, Group } from "./grid";

import { deepCloneMap, deepCloneMapOfSets } from "../utils/collections";

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
export function movesFromString(values: string): Moves {
  if (![81, 89].includes(values.length)) {
    throw new Error(
      `Puzzle string length ${values.length} must be 81 or 89 characters`
    );
  }

  const givens = new Moves();
  const width = values.length === 81 ? 9 : 10;

  for (const p of ALL_POINTS) {
    const value = valueFromString(values.charAt(width * p.r + p.c));
    if (value !== UNKNOWN) {
      givens.add(Strategy.Given).set(GRID.getCell(p), value);
    }
  }

  return givens;
}

// TODO Support clearing knowns and adding candidates?

export enum Strategy {
  /**
   * A known given at the start of the puzzle.
   */
  Given, // cell, known -> set cell to known
  /**
   * A manually set known.
   */
  Solve, // cell, known -> set cell to known
  /**
   * A manually removed candidate.
   */
  EraseMark, // cell, known -> remove candidate from cell

  /**
   * A mark cleared from a cell as a consequence of setting a known in one of its neighbors.
   */
  Neighbor,

  NakedSingle, // cell, candidate -> set cell to candidate; remove candidate from neighbors
  HiddenSingle, // cell, candidate, group(s) -> set cell to candidate

  PointingPair, // cells, candidate, intersection (follows from cells) -> cells; remove candidate from cells
  PointingTriple, // same ^
  BoxLineReduction, // same ^ in other direction

  NakedPair, // 2 cells, 2 candidates, 1 group -> cells; remove both candidates from other cells in group
  NakedTriple, // same ^ but with 3 cells and candidates
  NakedQuad,
  HiddenPair, // 2 cells, 2 candidates, 1 group -> remove other candidates from the cells
  HiddenTriple, // same ^ but with 3 cells and candidates
  HiddenQuad,

  XWing, // 4 cells, 1 candidate; 1 direction (row or column) -> cells; remove candidate from other cells in given direction
  SinglesChain, // cells, 1 candidate -> cells; remove candidate from cells
  YWing,
  XYZWing,
  Swordfish,
  Jellyfish,
  EmptyRectangle, // block, (2 cells, 1 candidate) -> cells; remove candidate from cells
  UniqueRectangle,

  BruteForce, // cell, candidate -> set cell to candidate
}

/**
 * Captures the strategy, clues (knowns and candidates), and the resulting changes
 * to make to the board as a result.
 *
 * Captures the player's moves as well to create a uniform interface.
 */
export class Move {
  static start(strategy: Strategy): Move {
    return new Move(strategy);
  }

  readonly strategy: Strategy;
  readonly groups: Set<Group>;
  readonly clues: Map<Cell, Map<Known, MarkColor>>;

  readonly sets: Map<Cell, Known>;
  readonly marks: Map<Cell, Set<Known>>;

  constructor(
    strategy: Strategy,
    groups?: Set<Group> | null,
    clues?: Map<Cell, Map<Known, MarkColor>> | null,
    sets?: Map<Cell, Known> | null,
    marks?: Map<Cell, Set<Known>> | null
  ) {
    this.strategy = strategy;
    this.groups = groups || new Set<Group>();
    this.clues = clues || new Map<Cell, Map<Known, MarkColor>>();
    this.sets = sets || new Map<Cell, Known>();
    this.marks = marks || new Map<Cell, Set<Known>>();
  }

  clone(): Move {
    return new Move(
      this.strategy,
      new Set(this.groups),
      deepCloneMap(this.clues, deepCloneMap),
      new Map(this.sets),
      deepCloneMapOfSets(this.marks)
    );
  }

  group(groups: Group | Iterable<Group> | IterableIterator<Group>): Move {
    if (isIterable(groups)) {
      for (const group of groups as Iterable<Group>) {
        this.groups.add(group);
      }
    } else {
      this.groups.add(groups as Group);
    }

    return this;
  }

  clue(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>,
    color: MarkColor = "green"
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        if (this.clues.has(cell)) {
          this.clues.get(cell)!.set(known, color);
        } else {
          this.clues.set(cell, new Map([[known, color]]));
        }
      }
    );
  }

  set(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    known: Known
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      known,
      (cell: Cell, known: Known) => {
        this.sets.set(cell, known);
      }
    );
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
          this.marks.get(cell)!.add(known);
        } else {
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
      `[${Strategy[this.strategy]}]`,
      ...Array.from(this.groups).map((g) => g.name),
      "clues",
      ...Array.from(this.clues.entries()).flatMap(([cell, colorsByKnown]) => [
        cell.point.k,
        Array.from(colorsByKnown.entries())
          .map(([known, color]) => `${known}:${color}`)
          .join(", "),
      ]),
      "sets",
      ...Array.from(this.sets.entries()).flatMap(([cell, known]) => [
        cell.point.k,
        known,
      ]),
      "marks",
      ...Array.from(this.marks.entries()).flatMap(([cell, known]) => [
        cell.point.k,
        ...known,
      ])
    );
  }

  getDecoration(cell: Cell): Decoration {
    return {
      borders: this.getBorders(cell),
      background: this.getBackground(cell),
      colors: this.getColors(cell),
      set: this.sets.get(cell) || UNKNOWN,
    };
  }

  getBorders(cell: Cell): Borders {
    if (this.groups.size) {
      return Array.from(this.groups)
        .map((group) => group.borders.get(cell))
        .filter(Boolean)
        .reduce(
          // @ts-ignore
          (borders: Borders, next: Borders) =>
            [
              borders[0] || next[0],
              borders[1] || next[1],
              borders[2] || next[2],
              borders[3] || next[3],
            ] as Borders,
          NO_BORDERS
        ) as Borders;
    } else if (this.sets.size) {
      if (this.sets.has(cell) && 0 < this.sets.size && this.sets.size < 10) {
        return FULL_BORDERS;
      }
    } else if (
      this.clues.size ||
      (0 < this.marks.size && this.marks.size < 10)
    ) {
      if (this.clues.has(cell) || this.marks.has(cell)) {
        return FULL_BORDERS;
      }
    }

    return NO_BORDERS;
  }

  getBackground(cell: Cell): CellColor | null {
    if (this.sets.has(cell)) {
      return "set";
    } else if (this.marks.has(cell)) {
      return "mark";
    } else if (this.clues.has(cell)) {
      return "clue";
    } else {
      return null;
    }
  }

  getColors(cell: Cell): Map<Known, MarkColor> {
    const clues = Array.from(this.clues.get(cell) || []);
    const marks = Array.from(this.marks.get(cell) || []);
    const set = this.sets.get(cell);

    return new Map<Known, MarkColor>([
      ...clues,
      ...marks.map((k) => [k, "red"]),
      ...(set ? [[set, "green"]] : []),
    ] as [Known, MarkColor][]);
  }

  apply(board: WritableBoard, moves: Moves) {
    for (const [cell, known] of this.sets) {
      if (!board.isSolved(cell) && board.isCandidate(cell, known)) {
        board.setKnown(cell, known, moves);
      }
    }

    for (const [cell, candidates] of this.marks) {
      if (!board.isSolved(cell)) {
        for (const candidate of candidates) {
          if (board.isCandidate(cell, candidate)) {
            board.removeCandidate(cell, candidate, true, moves);
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

export class Moves implements Iterable<Move> {
  private moves: Move[];

  constructor(moves: Move[] = []) {
    this.moves = moves;
  }

  [Symbol.iterator](): Iterator<Move> {
    return this.moves[Symbol.iterator]();
  }

  add(moveOrStrategy: Move | Strategy): Move {
    const move =
      moveOrStrategy instanceof Move
        ? moveOrStrategy
        : Move.start(moveOrStrategy);

    this.moves.push(move);

    return move;
  }

  concat(moves: Moves) {
    this.moves = this.moves.concat(moves.moves);
  }

  size(): number {
    return this.moves.length;
  }

  only(strategy: Strategy): Moves {
    return new Moves(this.moves.filter((m) => m.strategy === strategy));
  }

  except(strategy: Strategy): Moves {
    return new Moves(this.moves.filter((m) => m.strategy !== strategy));
  }

  apply(board: WritableBoard, strategy?: Strategy): Moves {
    const next = new Moves();
    const moves = strategy
      ? this.moves.filter((m) => m.strategy === strategy)
      : this.moves;

    for (const move of moves) {
      move.apply(board, next);
    }

    return next;
  }
}
