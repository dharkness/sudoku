/*
 * Functions to modify a board.
 */

import {
  BOARD,
  Cell,
  Coord,
  ALL_COORDS,
  getPoint,
  Grouping,
  ALL_GROUPINGS,
  Point,
  ALL_POINTS,
} from "./board";

// FIXME Move known/unknown stuff to board.ts

/**
 * Identifies a value to track known and possible values.
 */
export type Known = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * All valid cell values for iterating.
 */
export const ALL_KNOWNS: Known[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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
  groups: Map<Grouping, Map<Coord, Map<Known, Set<Point>>>>;
};

function clonePuzzle({ cells, groups }: Puzzle) {
  return {
    cells: new Map(cells),
    groups: cloneGroupPossibles(groups),
  };
}

function cloneGroupPossibles(
  groups: Map<Grouping, Map<Coord, Map<Known, Set<Point>>>>
): Map<Grouping, Map<Coord, Map<Known, Set<Point>>>> {
  const clone = new Map<Grouping, Map<Coord, Map<Known, Set<Point>>>>();

  for (const [grouping, group] of groups) {
    const groupClone = new Map<Coord, Map<Known, Set<Point>>>();
    clone.set(grouping, groupClone);
    for (const [c, knowns] of group) {
      const knownsClone = new Map<Known, Set<Point>>();
      groupClone.set(c, knownsClone);
      for (const [k, points] of knowns) {
        knownsClone.set(k, new Set(points));
      }
    }
  }

  return clone;
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
export class EditablePuzzle {
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
    cell.possible.forEach((k) => this.removePossible(point, k));
    cell.possible = new Set();

    const changes: Point[] = [];
    cell.cell.neighbors.forEach((point) => {
      if (this.removePossible(point, known)) {
        changes.push(point);
      }
    });
    console.log("set", point, known);
    // console.dir(changes);

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
    // console.dir(changes);

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
    const possible = new Set(ALL_KNOWNS);
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

    const cell = this.unlockCell(point);
    cell.possible.add(known);

    return true;
  }

  removePossible(point: Point, known: Known): boolean {
    if (!this.isPossible(point, known)) {
      return false;
    }

    const cell = this.unlockCell(point);
    cell.possible.delete(known);
    // if 1 left, trigger solver

    this.removeGroupPossible(Grouping.ROW, point.r, point, known);
    this.removeGroupPossible(Grouping.COLUMN, point.c, point, known);
    this.removeGroupPossible(Grouping.BLOCK, point.b, point, known);

    return true;
  }

  removeGroupPossible(
    grouping: Grouping,
    coord: Coord,
    point: Point,
    known: Known
  ): boolean {
    const knowns = this.puzzle.groups.get(grouping)!.get(coord);
    if (!knowns) {
      return false;
    }
    const points = knowns.get(known);
    if (!points || !points.has(point)) {
      return false;
    }

    points.delete(point);
    if (!points.size) {
      knowns.delete(known);
    }
    // else if 1 left, trigger solver

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
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.reduce((cells: string[], c) => {
          const value = this.getValue(getPoint(r, c));
          return [...cells, value === UNKNOWN ? "." : value.toString()];
        }, []).join("")
      )
    );
  }

  printPossibleCounts() {
    console.log("POSSIBLE COUNTS");
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.reduce((cells: string[], c) => {
          const count = this.getCell(getPoint(r, c)).possible.size;
          return [...cells, count ? count.toString() : "."];
        }, []).join("")
      )
    );
  }

  printPossibles(known: Known) {
    console.log("POSSIBLES", known);
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.reduce((cells: string[], c) => {
          const possible = this.isPossible(getPoint(r, c), known);
          return [...cells, possible ? known.toString() : "."];
        }, []).join("")
      )
    );
    for (const [g, groups] of this.puzzle.groups) {
      for (const [c, group] of groups) {
        const points = group.get(known);
        if (points) {
          console.log("POSSIBLES GROUP", g, "COORD", c);
          console.log(points);
        }
      }
    }
  }
}

export function emptyPuzzle(): Puzzle {
  const cells = Array.from(BOARD.cells.values());
  return {
    cells: cells.reduce(
      (map, cell) =>
        map.set(cell.point, {
          cell,
          value: UNKNOWN,
          possible: new Set(ALL_KNOWNS),
        }),
      new Map<Point, PuzzleCell>()
    ),
    groups: emptyGroupPossibles(),
  };
}

function emptyGroupPossibles(): Map<
  Grouping,
  Map<Coord, Map<Known, Set<Point>>>
> {
  const groups = new Map<Grouping, Map<Coord, Map<Known, Set<Point>>>>();

  for (const g of ALL_GROUPINGS) {
    const group = new Map<Coord, Map<Known, Set<Point>>>();
    groups.set(g, group);
    for (const c of ALL_COORDS) {
      const knowns = new Map<Known, Set<Point>>();
      group.set(c, knowns);
      for (const k of ALL_KNOWNS) {
        knowns.set(k, new Set(BOARD.groups[g]![c]!.points));
      }
    }
  }

  return groups;
}

export function puzzleFromString(values: string): EditablePuzzle {
  const puzzle = new EditablePuzzle(emptyPuzzle());
  ALL_POINTS.forEach((p) => {
    const value = values.charAt(10 * p.r + p.c);
    if ("1" <= value && value <= "9")
      return puzzle.setKnown(p, known(parseInt(value)));
  });
  return puzzle;
}

// const b = new EditablePuzzle(emptyPuzzle());
// b.setValue(getPoint(0, 0), 1);
// b.setValue(getPoint(3, 2), 5);
// b.setValue(getPoint(7, 5), 6);
// b.printValues();
// b.printPossibles(5);
// b.printPossibles(6);
// b.printPossibles(1);
// b.printPossibleCounts();

// const b = new EditablePuzzle(emptyPuzzle());
// b.setValue(getPoint(0, 0), 1);
// b.printValues();
// b.printPossibles(1);

// const start =
//   ".47.21689|.819.....|.638452.7|...75.92.|.7..32...|8.......3|49....1.2|7....483.|.2.5.....";
// const done =
//   "547321689|281976354|963845217|634758921|179432568|851169743|495683172|716294835|328517496";
//
// const b = puzzleFromString(start);
// b.printValues();
// b.printPossibleCounts();
