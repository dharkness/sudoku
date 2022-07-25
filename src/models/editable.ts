/*
 * Functions to modify a board.
 */

import {
  ALL_COORDS,
  ALL_GROUPINGS,
  ALL_POINTS,
  BOARD,
  Cell,
  Coord,
  getPoint,
  Grouping,
  pointGroupCoordsToString,
  Point,
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

class Solved {
  solutions = new Map<Point, Known>();

  get size(): number {
    return this.solutions.size;
  }

  randomized(): [Point, Known][] {
    return shuffle([...this.solutions.entries()]);
  }

  add(point: Point, known: Known): boolean {
    const current = this.solutions.get(point);
    if (known === current) {
      // console.log("SOLVE AGAIN", point.k, "=>", known);
      return false;
    } else if (current) {
      // console.log("SOLVE DIFFERENTLY", point.k, "=>", known);
    } else {
      // console.log("SOLVE", point.k, "=>", known);
    }

    this.solutions.set(point, known);
    return true;
  }

  remove(point: Point): boolean {
    if (!this.solutions.has(point)) {
      return false;
    }

    // console.log("REMOVE SOLVED", point.k, "=>", this.solutions.get(point));
    this.solutions.delete(point);
    return true;
  }
}

/**
 * Returns the single value of the given set
 *
 * @throws {Error} If the set is empty or has more than one element
 */
function singleSetValue<T>(set: Set<T>): T {
  switch (set.size) {
    case 0:
      throw new Error(`Cannot get a single value from an empty set`);
    case 1:
      return set.values().next().value;
    default:
      throw new Error(
        `Cannot get a single value from a set with ${set.size} members`
      );
  }
}

/**
 * Shuffles the given array in-place and returns it for convenience.
 */
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex]!,
      array[currentIndex]!,
    ];
  }

  return array;
}

/**
 * Provides copy-on-write semantics for editing a puzzle.
 */
export class EditablePuzzle {
  puzzle: Puzzle;

  unlockedPuzzle = false;
  unlockedCells = new Set<Point>();

  solved = new Solved();

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  clone(): EditablePuzzle {
    return new EditablePuzzle(this.puzzle);
  }

  getTotalKnown(): number {
    let count = 0;
    this.puzzle.cells.forEach((cell) => {
      if (cell.value !== UNKNOWN) {
        count += 1;
      }
    });
    return count;
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

  /**
   * Sets a cell to a known value.
   *
   * - Clear its possibles without triggering a final-possible solution.
   * - Remove the known from all touched cells' possibles.
   * - Remove the known from all containing groups.
   */
  setKnown(point: Point, known: Known): boolean {
    const previous = this.getValue(point);
    if (previous === known) {
      return false;
    }

    const cell = this.unlockCell(point);
    if (previous === UNKNOWN) {
      console.log("set", point.k, "to", known);
    } else {
      console.log("set", point.k, "from", previous, "to", known);
    }
    cell.value = known;
    this.solved.remove(point);
    this.clearGroupPossibles(Grouping.ROW, point.r, known);
    this.clearGroupPossibles(Grouping.COLUMN, point.c, known);
    this.clearGroupPossibles(Grouping.BLOCK, point.b, known);
    this.clearPossibles(point);
    cell.possible = new Set();

    const changes: Point[] = [];
    cell.cell.neighbors.forEach((point) => {
      if (this.removePossible(point, known)) {
        changes.push(point);
      }
    });
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
    cell.possible = this.getActualPossibles(point);

    const changes: Point[] = [];
    cell.cell.neighbors.forEach((point) => {
      if (
        this.isActualPossible(point, previous) &&
        this.addPossible(point, previous)
      ) {
        changes.push(point);
      }
    });
    console.log("clear", point.k);
    // console.dir(changes);

    return true;
  }

  isPossible(point: Point, known: Known) {
    return this.getCell(point).possible.has(known);
  }

  isAnyPossible(point: Point) {
    return this.getCell(point).possible.size > 0;
  }

  isActualPossible(point: Point, known: Known): boolean {
    for (const p of this.getCell(point).cell.neighbors) {
      if (this.getValue(p) === known) {
        return false;
      }
    }

    return true;
  }

  getActualPossibles(point: Point): Set<Known> {
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

  clearPossibles(point: Point): boolean {
    if (!this.isAnyPossible(point)) {
      return false;
    }

    const cell = this.unlockCell(point);

    cell.possible.forEach((k) => {
      this.removeGroupPossible(Grouping.ROW, point.r, k, point);
      this.removeGroupPossible(Grouping.COLUMN, point.c, k, point);
      this.removeGroupPossible(Grouping.BLOCK, point.b, k, point);
    });
    cell.possible.clear();

    return true;
  }

  removePossible(point: Point, known: Known): boolean {
    if (!this.isPossible(point, known)) {
      return false;
    }

    const cell = this.unlockCell(point);
    cell.possible.delete(known);
    if (cell.possible.size === 1) {
      if (cell.value) {
        console.log("SOLVING KNOWN CELL", point.k, cell.value, "=>", known);
      }
      if (this.solved.add(point, singleSetValue(cell.possible))) {
        console.log(
          "SOLVE remove",
          known,
          "from",
          point.k,
          "=>",
          singleSetValue(cell.possible)
        );
        this.printValues();
      }
    }

    this.removeGroupPossible(Grouping.ROW, point.r, known, point);
    this.removeGroupPossible(Grouping.COLUMN, point.c, known, point);
    this.removeGroupPossible(Grouping.BLOCK, point.b, known, point);

    return true;
  }

  clearGroupPossibles(grouping: Grouping, coord: Coord, known: Known): boolean {
    // console.log("remove", known, "from", Grouping[grouping], coord + 1, "?");
    const knowns = this.puzzle.groups.get(grouping)!.get(coord);
    if (!knowns || !knowns.has(known)) {
      return false;
    }
    knowns.delete(known);

    // FIXME knowns has only one left now? by necessity, the remaining known is in the remaining unsolved cell, and that cell now has only one possibility

    return true;
  }

  removeGroupPossible(
    grouping: Grouping,
    coord: Coord,
    known: Known,
    point: Point
  ): boolean {
    // console.log(
    //   "remove",
    //   known,
    //   "from",
    //   Grouping[grouping],
    //   coord + 1,
    //   "index",
    //   point.i[grouping] + 1,
    //   "?"
    // );
    const knowns = this.puzzle.groups.get(grouping)!.get(coord);
    if (!knowns) {
      return false;
    }
    // console.log("knowns", [...knowns.keys()].join(", "));
    const points = knowns.get(known);
    if (!points || !points.has(point)) {
      return false;
    }
    // console.log(
    //   "points",
    //   [...points.values()].map((p) => p.i[grouping] + 1).join(", ")
    // );

    points.delete(point);
    if (!points.size) {
      knowns.delete(known);
      // FIXME knowns has only one left now?
    } else if (points.size === 1) {
      const solved = singleSetValue(points);
      const cell = this.puzzle.cells.get(solved)!;
      if (cell.value) {
        console.log("SOLVING KNOWN CELL", solved.k, cell.value, "=>", known);
      }
      if (this.solved.add(solved, known)) {
        this.printValues();
        console.log(
          "SOLVE remove",
          point.k,
          "from",
          Grouping[grouping],
          coord + 1,
          "FOR",
          known,
          "SET",
          solved.k,
          "=>",
          known
        );
      }
    }

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

  validate() {
    for (let p of ALL_POINTS) {
      const cell = this.getCell(p);
      if (cell.value) {
        const known = cell.value;
        if (cell.possible.size) {
          console.log(
            "INVALID - cell",
            p.k,
            "known",
            known,
            "has possibles",
            cell.possible
          );
        }
        for (let n of cell.cell.neighbors) {
          const neighbor = this.getCell(n);
          if (neighbor.value === known) {
            console.log(
              "INVALID - cell",
              p.k,
              "known",
              known,
              "has neighbor",
              n.k,
              "with same value"
            );
          }
          if (neighbor.possible.has(known)) {
            console.log(
              "INVALID - cell",
              p.k,
              "known",
              known,
              "has neighbor",
              n.k,
              "with same possible"
            );
          }
        }
      }
    }
  }

  toString(): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = this.getValue(getPoint(r, c));
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    ).join("|");
  }

  printValues() {
    console.log("  ", 123456789);
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.map((c) => {
          const value = this.getValue(getPoint(r, c));
          return value === UNKNOWN ? "." : value.toString();
        }).join("")
      )
    );
  }

  printPossibleCounts() {
    console.log("POSSIBLE COUNTS");
    console.log("  ", 123456789);
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
    console.log("  ", 123456789);
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
        if (points?.size) {
          console.log(
            Grouping[g],
            c + 1,
            "-",
            pointGroupCoordsToString(g, points)
          );
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
  for (const p of ALL_POINTS) {
    const value = values.charAt(10 * p.r + p.c);
    if ("1" <= value && value <= "9") {
      if (puzzle.setKnown(p, known(parseInt(value)))) {
        puzzle.validate();
      }
      // break;
    }
  }
  return puzzle;
}

export function solvedFromString(values: string): Solved {
  const solved = new Solved();
  for (const p of ALL_POINTS) {
    const value = values.charAt(10 * p.r + p.c);
    if ("1" <= value && value <= "9") {
      solved.add(p, known(parseInt(value)));
    }
  }
  return solved;
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
//   "547321689|281976354|963845217|634758921|179432568|852169743|495683172|716294835|328517496";

// const start =
//   ".18....4.|753...1..|..6.57...|.3..72..4|6.983.2..|8....9...|..5.6..29|.7...8.61|....1....";
// const done =
//   "218396745|753284196|496157832|531672984|649831257|827549613|185763429|374928561|962415378";

const start =
  "7..1....9|.2.3..7..|4.9......|.6.8..2..|.........|.7...1.5.|.....49..|.46..5..2|.1...68..";
const done =
  "7..1....9|.2.3..7..|4.9......|.6.8..2..|.........|.7...1.5.|.....49..|.46..5..2|.1...68..";

let puzzle = new EditablePuzzle(emptyPuzzle());
const solutions = [solvedFromString(start)];
const puzzles = [puzzle];
while (solutions.length) {
  const solved = solutions.shift()!;
  console.log(
    "solving",
    solved.size,
    "of",
    81 - puzzle.getTotalKnown(),
    "unknowns"
  );
  for (const [p, k] of solved.randomized()) {
    puzzle = puzzle.clone();
    puzzle.setKnown(p, k);
    puzzles.push(puzzle);
    if (puzzle.solved.size) {
      solutions.push(puzzle.solved);
    }
    // puzzle.printValues();
  }
  // ALL_KNOWNS.forEach((k) => b.printPossibles(k));
  // break;
}

console.log("still", 81 - puzzle.getTotalKnown(), "unknown");
console.log("done", puzzle.toString());
console.log("correct?", done === puzzle.toString());

for (let p of puzzles) {
  p.printValues();
}

// b.printPossibleCounts();
