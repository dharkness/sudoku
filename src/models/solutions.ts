import { shuffle } from "../utils/collections";

import { ALL_POINTS, known, Known, UNKNOWN, valueFromString } from "./basics";
import { BOARD, Cell } from "./structure";

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

  forEach(callback: (Known: Known, cell: Cell) => void): void {
    this.knowns.forEach(callback);
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

  forEachSolvedKnown(callback: (Known: Known, cell: Cell) => void): void {
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
 * and any character (typically a period) for an unknown cell,
 * and rows should be separated by any single character (typically a space).
 *
 * For example:
 *
 * "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68.."
 */
export function solutionsFromString(values: string): Solutions {
  const solutions = new Solutions();

  for (const p of ALL_POINTS) {
    const value = valueFromString(values.charAt(10 * p.r + p.c));
    if (value !== UNKNOWN) {
      solutions.addSolvedKnown(BOARD.getCell(p), value);
    }
  }

  return solutions;
}
