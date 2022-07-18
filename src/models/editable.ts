/*
 * Functions to modify a board.
 */

import { board, Cell, coords, getPoint, Point, points } from "./board";

/**
 * Identifies a value to track known and possible values.
 */
export type Known = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * All valid cell values for iterating.
 */
const knowns: Known[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Returns the value as the correct type if it is valid.
 *
 * @throws {Error} If it is not a valid known value
 */
function known(value: number): Known {
  if (value < 1 || 9 < value) {
    throw new Error(`Invalid cell value (${value})`);
  }
  return value as Known;
}

/**
 * Used to mark cells that are not yet known.
 */
export const UNKNOWN = null;
export type Unknown = null;
export type Value = Known | Unknown;

/**
 * Tracks all the remaining possible values.
 */
type Possible = Set<Known>;

/**
 * Holds the state of each puzzle cell.
 */
type Puzzle = {
  cells: Map<Point, PuzzleCell>;
};

function clonePuzzle({ cells }: Puzzle) {
  return { cells: new Map(cells) };
}

/**
 * Tracks the state of a single cell in the puzzle.
 */
type PuzzleCell = {
  cell: Cell;
  value: Value;
  possible: Possible;
};

function clonePuzzleCell({ cell, value, possible }: PuzzleCell) {
  return {
    cell,
    value,
    possible: new Set(possible),
  };
}

/**
 * Provides copy-on-write semantics for editing a puzzle.
 */
class EditablePuzzle {
  puzzle: Puzzle;

  unlockedPuzzle = false;
  unlockedCells = new Set<Point>();

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  getCell(point: Point): PuzzleCell {
    return this.puzzle.cells.get(point)!;
  }

  getValue(point: Point): Value {
    return this.getCell(point).value;
  }

  setValue(point: Point, value: Value): boolean {
    if (value === UNKNOWN) {
      return this.setUnknown(point);
    } else {
      return this.setKnown(point, value);
    }
  }

  setKnown(point: Point, known: Known): boolean {
    const previous = this.getValue(point);
    if (previous === known) {
      return false;
    }

    const cell = this.unlockCell(point);
    cell.value = known;
    cell.possible = this.getActuallyPossible(point);

    const changes: Point[] = [];
    cell.cell.neighbors.forEach((point) => {
      if (this.removePossible(point, known)) {
        changes.push(point);
      }
    });
    console.log("set", point);
    console.dir(changes);

    return true;
  }

  setUnknown(point: Point): boolean {
    const previous = this.getValue(point);
    if (previous === UNKNOWN) {
      return false;
    }

    const cell = this.unlockCell(point);
    cell.value = UNKNOWN;
    cell.possible = this.getActuallyPossible(point);

    const changes: Point[] = [];
    cell.cell.neighbors.forEach((point) => {
      if (
        this.isActuallyPossible(point, previous) &&
        this.addPossible(point, previous)
      ) {
        changes.push(point);
      }
    });
    console.log("clear", point);
    console.dir(changes);

    return true;
  }

  isPossible(point: Point, known: Known) {
    return this.getCell(point).possible.has(known);
  }

  isActuallyPossible(point: Point, known: Known): boolean {
    for (const p of this.getCell(point).cell.neighbors) {
      if (this.getValue(p) === known) {
        return false;
      }
    }

    return true;
  }

  getActuallyPossible(point: Point): Set<Known> {
    const possible = new Set(knowns);
    for (const p of this.getCell(point).cell.neighbors) {
      const value = this.getValue(p);
      if (value !== UNKNOWN) {
        possible.delete(value);
      }
    }

    return possible;
  }

  addPossible(point: Point, known: Known): boolean {
    if (this.isPossible(point, known)) {
      return false;
    }

    this.unlockCell(point);
    this.getCell(point).possible.add(known);

    return true;
  }

  removePossible(point: Point, known: Known): boolean {
    if (!this.isPossible(point, known)) {
      return false;
    }

    this.unlockCell(point);
    this.getCell(point).possible.delete(known);

    return true;
  }

  unlockPuzzle() {
    if (this.unlockedPuzzle) {
      return;
    }

    this.puzzle = clonePuzzle(this.puzzle);
    this.unlockedPuzzle = true;
  }

  unlockCell(point: Point) {
    const cell = this.puzzle.cells.get(point)!;
    if (this.unlockedCells.has(point)) {
      return cell;
    }

    this.unlockPuzzle();
    const clone = clonePuzzleCell(cell);
    this.puzzle.cells.set(point, clone);
    this.unlockedCells.add(point);
    return clone;
  }

  printValues() {
    coords.forEach((r) =>
      console.log(
        r + 1,
        coords
          .reduce((cells: string[], c) => {
            const value = this.getValue(getPoint(r, c));
            return [...cells, value === UNKNOWN ? "." : value.toString()];
          }, [])
          .join("")
      )
    );
  }

  printPossibleCounts() {
    coords.forEach((r) =>
      console.log(
        r + 1,
        coords
          .reduce((cells: string[], c) => {
            const count = this.getCell(getPoint(r, c)).possible.size;
            return [...cells, count ? count.toString() : "."];
          }, [])
          .join("")
      )
    );
  }

  printPossibles(known: Known) {
    coords.forEach((r) =>
      console.log(
        r + 1,
        coords
          .reduce((cells: string[], c) => {
            const possible = this.isPossible(getPoint(r, c), known);
            return [...cells, possible ? known.toString() : "."];
          }, [])
          .join("")
      )
    );
  }
}

function emptyPuzzle(): Puzzle {
  const cells = Array.from(board.cells.values());
  return {
    cells: cells.reduce(
      (map, cell) =>
        map.set(cell.point, {
          cell,
          value: UNKNOWN,
          possible: new Set(knowns),
        }),
      new Map<Point, PuzzleCell>()
    ),
  };
}

function puzzleFromString(values: string): EditablePuzzle {
  const puzzle = new EditablePuzzle(emptyPuzzle());
  points.forEach((p) => {
    const value = values.charAt(10 * p.r + p.c);
    if ("1" <= value && value <= "9")
      return puzzle.setKnown(p, known(parseInt(value)));
  });
  return puzzle;
}

// const b = new EditablePuzzle(emptyPuzzle());
// b.setValue(getPoint(6, 1), 4);
// b.setValue(getPoint(3, 2), 5);
// b.setValue(getPoint(7, 5), 6);
// b.printValues();
// b.printPossibles(4);
// b.printPossibles(5);
// b.printPossibles(6);
// b.printPossibles(1);
// b.printPossibleCounts();

const start =
  ".47.21689|.819.....|.638452.7|...75.92.|.7..32...|8.......3|49....1.2|7....483.|.2.5.....";
const done =
  "547321689|281976354|963845217|634758921|179432568|851169743|495683172|716294835|328517496";

const b = puzzleFromString(start);
b.printValues();
b.printPossibleCounts();
