/*
 * Defines the structure of a standard Sudoku board.
 */

import { shuffle, singleSetValue } from "../utils/collections";
import { Grouping, pointGroupCoordsToString } from "./board";

/**
 * Identifies a row, column, or block (numbered left-to-right, top-to-bottom)
 */
export type Coord = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * All valid coordinate values for iterating and generating other constructs.
 */
export const ALL_COORDS: Coord[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Returns the coordinate as the correct type if it is valid.
 *
 * @throws {Error} If the coordinate is outside the board
 */
export function coord(value: number, type: string): Coord {
  if (value < 0 || 8 < value) {
    throw new Error(`Invalid ${type} (${value})`);
  }
  return value as Coord;
}

/**
 * Identifies a single cell on the board.
 */
export type Point = {
  c: Coord;
  r: Coord;
  b: Coord;
  i: [Coord, Coord, Coord];
  k: string;
};

/**
 * All points indexed by their coordinates, row then column.
 */
const pointsByRowCol: Point[][] = ALL_COORDS.reduce(
  (itemRows, r) => [
    ...itemRows,
    ALL_COORDS.reduce((items, c) => {
      const b = coord(3 * Math.floor(r / 3) + Math.floor(c / 3), "b");
      return [
        ...items,
        {
          r,
          c,
          b,
          i: [c, r, coord(3 * (r % 3) + (c % 3), "bi")],
          k: `${r + 1},${c + 1}`,
        },
      ];
    }, [] as Point[]),
  ],
  [] as Point[][]
);

export const ALL_POINTS: Point[] = ALL_COORDS.reduce(
  (points, r) => [
    ...points,
    ...ALL_COORDS.reduce(
      (points, c) => [...points, getPoint(r, c)],
      [] as Point[]
    ),
  ],
  [] as Point[]
);

/**
 * Returns the unique point instance for the given coordinates.
 */
export function getPoint(r: Coord, c: Coord): Point {
  return pointsByRowCol[r]![c]!;
}

/**
 * Returns a point relative to another.
 *
 * @throws {Error} If the new coordinates are outside the board
 */
function delta({ r, c }: Point, dc: number, dr: number): Point {
  return getPoint(coord(r + dr, "r"), coord(c + dc, "c"));
}

/**
 * Returns a new list of points without any duplicates.
 */
function uniquePoints(points: Point[]): Point[] {
  return Array.from(new Set<Point>(points));
}

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

// known possibles
// - tracks which knowns are still possible in a cell
// - removing the second-to-last known for a cell sets that cell to the remaining value
// x removing the second-to-last known for a group does nothing since the last cell
//   in the group will be forced to the remaining value by the preceding step,
//   so this is merely cleanup
// x removing the second-to-last known from a disjoint does nothing since it doesn't have to contain it
//
// point possibles by known
// - tracks which points are still possible for each known in a group or disjoint
// - removing the second-to-last point for a group sets the remaining point's cell to the known
// - removing the last point for a disjoint removes the known from the matching disjoint and its cells

// setKnown(point, known)
// - set cell value to known
// - clear all known possibles from cell, without triggering
//   since the cell is being set to a known
// - remove known possible from groups, effectively removing all point possibles without triggering
// - remove known possible from neighbors, triggering
// - remove point possible from disjoints, triggering
//
// removePossible(point, known)
// - if last possible, schedule setKnown() for remaining known
// - remove point possible from row, col, box, triggering
// - remove point possible from disjoints, triggering

// Cell
// - point
// - possible knowns
// - possible knowns trackers
// - possible points trackers
// + setKnown(known)
//   - set value
//   - clearKnowns()
//   - remove known from known trackers
//   - remove point from point trackers
// - removeKnown(known)
//   - remove known
//   - remove point from point trackers
//   - trigger on one left: set point to known
// = clearKnowns() - no trigger
//
// Group
// - points
// - possible points by known
// - removeKnown(known) - remove point possibles for known, no trigger
// - removePoint(known, point) - trigger on one left: set remaining point to known
//
// Disjoint (pair per Intersection)
// - points
// - possible points by known
// + intersection (points) - needed?
// + matchingPoints
// - removeKnown(known) - noop
// - removePoint(known, point) - trigger on none left: remove known from matching points
//
// Neighbors
// - points
// x point possibles by known
// - removeKnown(known) - call for each point, triggering
// x removePoint(known, point) - noop

interface Puzzle {
  isKnown(point: Point): boolean;
  getTotalKnown(): number;

  getValue(point: Point): Value;
  setValue(point: Point, value: Value): void;

  resetPossibleKnowns(owner: any): void;
  getPossibleKnownsCount(owner: any): number;
  isPossibleKnown(owner: any, known: Known): boolean;
  removePossibleKnown(owner: any, known: Known): Set<Known>;
  clearPossibleKnowns(owner: any): void;
  // getPossibleKnowns(owner: any): Set<Known>;

  resetPossiblePoints(owner: any, points: PointSet): void;
  isPossiblePoint(owner: any, known: Known, point: Point): boolean;
  removePossiblePoint(owner: any, known: Known, point: Point): Set<Point>;
  // getPossiblePoints(owner: any, known: Known): Set<Point>;

  resetSolved(): void;
  getSolved(): Solved;
  addSolved(point: Point, known: Known): void;
  removeSolved(point: Point): void;
}

class PuzzleState implements Puzzle {
  private values = new Map<Point, Value>();
  private possibleKnowns = new Map<any, Set<Known>>();
  private possiblePoints = new Map<any, Map<Known, Set<Point>>>();

  private solved = new Solved();

  isKnown(point: Point): boolean {
    return false;
  }
  getTotalKnown(): number {
    let count = 0;
    this.values.forEach((value) => {
      if (value !== UNKNOWN) {
        count += 1;
      }
    });
    return count;
  }

  getValue(point: Point): Value {
    return this.values.get(point)!;
  }
  setValue(point: Point, value: Value): void {
    this.values.set(point, value);
  }

  resetPossibleKnowns(owner: any): void {
    this.possibleKnowns.set(owner, new Set(ALL_KNOWNS));
  }
  getPossibleKnownsCount(owner: any): number {
    return this.possibleKnowns.get(owner)?.size ?? 0;
  }
  isPossibleKnown(owner: any, known: Known): boolean {
    return this.possibleKnowns.get(owner)?.has(known) ?? false;
  }
  removePossibleKnown(owner: any, known: Known): Set<Known> {
    const knowns = this.possibleKnowns.get(owner);
    if (knowns) {
      knowns.delete(known);
    }
    return knowns ?? new Set();
  }
  clearPossibleKnowns(owner: any): void {
    this.possibleKnowns.set(owner, new Set());
  }

  resetPossiblePoints(owner: any, points: PointSet): void {
    for (const k of ALL_KNOWNS) {
      this.possiblePoints.set(
        owner,
        new Map(ALL_KNOWNS.map((k) => [k, new Set(points)]))
      );
    }
  }
  isPossiblePoint(owner: any, known: Known, point: Point): boolean {
    return this.possiblePoints.get(owner)?.get(known)?.has(point) ?? false;
  }
  removePossiblePoint(owner: any, known: Known, point: Point): Set<Point> {
    const points = this.possiblePoints.get(owner)?.get(known);
    if (points) {
      points.delete(point);
    }
    return points ?? new Set();
  }

  resetSolved(): void {
    this.solved = new Solved();
  }
  getSolved(): Solved {
    return this.solved;
  }
  addSolved(point: Point, known: Known): void {
    this.solved.add(point, known);
  }
  removeSolved(point: Point): void {
    this.solved.remove(point);
  }
}

interface Stateful {
  addEmptyState(puzzle: Puzzle): void;
}

// ====================================================================================================

interface PossibleKnownsTracker {
  getPossibleKnownsCount(puzzle: Puzzle): number;
  removePossibleKnown(puzzle: Puzzle, known: Known): boolean;
}

interface PossiblePointsByKnownTracker {
  removePossiblePoint(puzzle: Puzzle, known: Known, point: Point): boolean;
}

class PointSet extends Set<Point> {
  union(other: PointSet): PointSet {
    const result = new PointSet(this);

    for (const p of other) {
      result.add(p);
    }

    return result;
  }

  intersect(other: PointSet): PointSet {
    const result = new PointSet();

    for (const p of this) {
      if (other.has(p)) {
        result.add(p);
      }
    }

    return result;
  }

  diff(other: PointSet): PointSet {
    const result = new PointSet();

    for (const p of this) {
      if (!other.has(p)) {
        result.add(p);
      }
    }

    return result;
  }
}

abstract class PointSetTracker {
  protected board: Board;
  protected points: PointSet;

  constructor(board: Board, points: PointSet) {
    this.board = board;
    this.points = points;
  }

  has(point: Point): boolean {
    return this.points.has(point);
  }

  union(other: PointSet | PointSetTracker): PointSet {
    if (other instanceof PointSet) {
      return this.points.union(other);
    } else {
      return this.points.union(other.points);
    }
  }

  intersect(other: PointSet | PointSetTracker): PointSet {
    if (other instanceof PointSet) {
      return this.points.intersect(other);
    } else {
      return this.points.intersect(other.points);
    }
  }

  diff(other: PointSet | PointSetTracker): PointSet {
    if (other instanceof PointSet) {
      return this.points.diff(other);
    } else {
      return this.points.diff(other.points);
    }
  }
}

class CellTracker implements PossibleKnownsTracker, Stateful {
  private board: Board;
  private point: Point;

  private row: RowTracker;
  private column: ColumnTracker;
  private block: BlockTracker;

  private knownTrackers: PossibleKnownsTracker[] = [];
  private pointTrackers: PossiblePointsByKnownTracker[] = [];

  constructor(
    board: Board,
    point: Point,
    row: RowTracker,
    column: ColumnTracker,
    block: BlockTracker
  ) {
    this.board = board;
    this.point = point;
    this.row = row;
    this.column = column;
    this.block = block;
  }

  addKnownTracker(tracker: PossibleKnownsTracker) {
    this.knownTrackers.push(tracker);
  }

  addPointTracker(tracker: PossiblePointsByKnownTracker) {
    this.pointTrackers.push(tracker);
  }

  addEmptyState(puzzle: Puzzle): void {
    puzzle.setValue(this.point, UNKNOWN);
    puzzle.resetPossibleKnowns(this);
  }

  getNeighbors(): PointSet {
    const union = this.block.union(this.row.union(this.column));
    union.delete(this.point);
    return union;
  }

  getValue(puzzle: Puzzle): Value {
    return puzzle.getValue(this.point);
  }

  setKnown(puzzle: Puzzle, known: Known): boolean {
    const point = this.point;
    const previous = puzzle.getValue(point);
    if (previous === known) {
      return false;
    }

    if (previous === UNKNOWN) {
      console.log("set", point.k, "=>", known);
    } else {
      console.log("set", point.k, "=>", known, "x", previous);
    }
    puzzle.setValue(point, known);
    puzzle.clearPossibleKnowns(this);
    puzzle.removeSolved(point);

    for (const t of this.knownTrackers) {
      t.removePossibleKnown(puzzle, known);
    }
    for (const t of this.pointTrackers) {
      t.removePossiblePoint(puzzle, known, point);
    }

    return true;
  }

  getPossibleKnownsCount(puzzle: Puzzle): number {
    return puzzle.getPossibleKnownsCount(this);
  }

  removePossibleKnown(puzzle: Puzzle, known: Known): boolean {
    if (!puzzle.isPossibleKnown(this, known)) {
      return false;
    }

    const remaining = puzzle.removePossibleKnown(this, known);
    if (remaining.size === 1) {
      puzzle.addSolved(this.point, singleSetValue(remaining));
    }

    for (const t of this.pointTrackers) {
      t.removePossiblePoint(puzzle, known, this.point);
    }

    return true;
  }
}

abstract class AbstractPossiblePointsByKnownTracker
  extends PointSetTracker
  implements PossiblePointsByKnownTracker, Stateful
{
  constructor(board: Board, points: PointSet) {
    super(board, points);
  }

  addEmptyState(puzzle: Puzzle): void {
    puzzle.resetPossiblePoints(this, this.points);
  }

  removePossiblePoint(puzzle: Puzzle, known: Known, point: Point): boolean {
    if (!puzzle.isPossiblePoint(this, known, point)) {
      return false;
    }

    const remaining = puzzle.removePossiblePoint(this, known, point);
    switch (remaining.size) {
      case 1:
        this.onOnePointLeft(puzzle, known, point);
        break;

      case 0:
        this.onNoPointsLeft(puzzle, known);
        break;
    }

    return true;
  }

  onOnePointLeft(puzzle: Puzzle, known: Known, point: Point) {
    // override if necessary
  }

  onNoPointsLeft(puzzle: Puzzle, known: Known) {
    // override if necessary
  }
}

class GroupTracker
  extends AbstractPossiblePointsByKnownTracker
  implements PossibleKnownsTracker
{
  getPossibleKnownsCount(puzzle: Puzzle): number {
    return puzzle.getPossibleKnownsCount(this);
  }

  // TODO is this even needed? maybe for other solvers
  removePossibleKnown(puzzle: Puzzle, known: Known): boolean {
    if (!puzzle.isPossibleKnown(this, known)) {
      return false;
    }

    puzzle.removePossibleKnown(this, known);
    // nothing to trigger; if last known left, it'll get solved by the cell tracker

    return true;
  }

  onOnePointLeft(puzzle: Puzzle, known: Known, point: Point) {
    puzzle.addSolved(point, known);
  }
}

class RowTracker extends GroupTracker {
  constructor(board: Board, r: Coord) {
    super(board, new PointSet(ALL_COORDS.map((c) => getPoint(r, c))));
  }
}

class ColumnTracker extends GroupTracker {
  constructor(board: Board, c: Coord) {
    super(board, new PointSet(ALL_COORDS.map((r) => getPoint(r, c))));
  }
}

class BlockTracker extends GroupTracker {
  /**
   * Delta values as [dc, dr] from the top-left cell in a block that identify its cells.
   * The resulting cells will be left-to-right, top-to-bottom.
   */
  static deltas: [number, number][] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ];

  constructor(board: Board, b: Coord) {
    const topLeft = getPoint(
      coord(3 * Math.floor(b / 3), "r"),
      coord(3 * (b % 3), "c")
    );
    super(
      board,
      new PointSet(
        BlockTracker.deltas.map(([dc, dr]) => delta(topLeft, dc, dr))
      )
    );
  }
}

class DisjointTracker extends AbstractPossiblePointsByKnownTracker {
  intersection: PointSet;
  disjointCells: CellTracker[];

  constructor(
    board: Board,
    intersection: PointSet,
    points: PointSet,
    disjointCells: CellTracker[]
  ) {
    super(board, points);
    this.intersection = intersection;
    this.disjointCells = disjointCells;
  }

  onNoPointsLeft(puzzle: Puzzle, known: Known): void {
    for (const cell of this.disjointCells) {
      cell.removePossibleKnown(puzzle, known);
    }
  }
}

class NeighborsTracker
  extends PointSetTracker
  implements PossibleKnownsTracker, Stateful
{
  addEmptyState(puzzle: Puzzle): void {
    puzzle.resetPossiblePoints(this, this.points);
  }

  getPossibleKnownsCount(puzzle: Puzzle): number {
    return puzzle.getPossibleKnownsCount(this);
  }

  removePossibleKnown(puzzle: Puzzle, known: Known): boolean {
    let removed = false;

    for (const cell of this.board.getCells(this.points)) {
      if (cell.removePossibleKnown(puzzle, known)) {
        removed = true;
      }
    }

    return removed;
  }
}

/**
 * Provides access to the cells and related structures that make up a standard Sudoku board.
 */
class Board {
  cells = new Map<Point, CellTracker>();
  rows: RowTracker[] = [];
  columns: ColumnTracker[] = [];
  blocks: BlockTracker[] = [];

  statefuls = new Set<Stateful>();

  constructor() {
    this.createGroups();
    this.createCells();
    this.createNeighbors();
    this.createIntersections();
  }

  private createGroups() {
    this.rows = ALL_COORDS.map((r) => new RowTracker(this, r));
    this.columns = ALL_COORDS.map((c) => new ColumnTracker(this, c));
    this.blocks = ALL_COORDS.map((b) => new BlockTracker(this, b));

    this.rows.forEach((r) => this.statefuls.add(r));
    this.columns.forEach((c) => this.statefuls.add(c));
    this.blocks.forEach((b) => this.statefuls.add(b));
  }

  private createCells() {
    for (const r of ALL_COORDS) {
      for (const c of ALL_COORDS) {
        const point = getPoint(r, c);
        const cell = new CellTracker(
          this,
          point,
          this.rows[point.r]!,
          this.columns[point.c]!,
          this.blocks[point.b]!
        );
        this.cells.set(point, cell);
        this.statefuls.add(cell);
      }
    }
  }

  private createNeighbors() {
    this.cells.forEach((cell) =>
      cell.addKnownTracker(new NeighborsTracker(this, cell.getNeighbors()))
    );
  }

  private createIntersections() {
    for (const block of this.blocks) {
      this.createDisjoints(block, this.rows);
      this.createDisjoints(block, this.columns);
    }
  }

  private createDisjoints(block: BlockTracker, groups: GroupTracker[]) {
    for (const group of groups) {
      const intersection = block.intersect(group);
      const blockPoints = block.diff(intersection);
      const groupPoints = group.diff(intersection);

      const blockDisjoint = new DisjointTracker(
        this,
        intersection,
        blockPoints,
        this.getCells(groupPoints)
      );
      this.statefuls.add(blockDisjoint);
      for (const p of blockPoints) {
        this.cells.get(p)!.addPointTracker(blockDisjoint);
      }

      const groupDisjoint = new DisjointTracker(
        this,
        intersection,
        groupPoints,
        this.getCells(blockPoints)
      );
      this.statefuls.add(groupDisjoint);
      for (const p of groupPoints) {
        this.cells.get(p)!.addPointTracker(groupDisjoint);
      }
    }
  }

  getValue(puzzle: Puzzle, point: Point): Value {
    return this.cells.get(point)!.getValue(puzzle);
  }

  getCells(points: PointSet): CellTracker[] {
    return [...points.values()].map((p) => this.cells.get(p)!);
  }

  setKnown(puzzle: Puzzle, point: Point, known: Known): boolean {
    return this.cells.get(point)!.setKnown(puzzle, known);
  }

  removePossibleKnown(puzzle: Puzzle, point: Point, known: Known): boolean {
    return this.cells.get(point)!.removePossibleKnown(puzzle, known);
  }

  emptyPuzzle(): Puzzle {
    const puzzle = new PuzzleState();

    for (const s of this.statefuls) {
      s.addEmptyState(puzzle);
    }

    return puzzle;
  }

  toString(puzzle: Puzzle): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = puzzle.getValue(getPoint(r, c));
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    ).join(" ");
  }

  printValues(puzzle: Puzzle) {
    console.log("  ", 123456789);
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.map((c) => {
          const value = this.cells.get(getPoint(r, c))!.getValue(puzzle);
          return value === UNKNOWN ? "." : value.toString();
        }).join("")
      )
    );
  }

  printPossibleCounts(puzzle: Puzzle) {
    console.log("POSSIBLE COUNTS");
    console.log("  ", 123456789);
    ALL_COORDS.forEach((r) =>
      console.log(
        r + 1,
        ALL_COORDS.reduce((cells: string[], c) => {
          const count = this.cells
            .get(getPoint(r, c))!
            .getPossibleKnownsCount(puzzle);
          return [...cells, count ? count.toString() : "."];
        }, []).join("")
      )
    );
  }

  // printPossibles(puzzle: Puzzle, known: Known) {
  //   console.log("POSSIBLES", known);
  //   console.log("  ", 123456789);
  //   ALL_COORDS.forEach((r) =>
  //     console.log(
  //       r + 1,
  //       ALL_COORDS.reduce((cells: string[], c) => {
  //         const possible = puzzle.isPossibleKnown(this.cells.get(getPoint(r, c))!, known);
  //         return [...cells, possible ? known.toString() : "."];
  //       }, []).join("")
  //     )
  //   );
  //   for (const [g, groups] of this.puzzle.groups) {
  //     for (const [c, group] of groups) {
  //       const points = group.get(known);
  //       if (points?.size) {
  //         console.log(
  //           Grouping[g],
  //           c + 1,
  //           "-",
  //           pointGroupCoordsToString(g, points)
  //         );
  //       }
  //     }
  //   }
  // }
}

export const BOARD = new Board();

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

const start =
  ".47.21689 .819..... .638452.7 ...75.92. .7..32... 8.......3 49....1.2 7....483. .2.5.....";
const done =
  "547321689 281976354 963845217 634758921 179432568 852169743 495683172 716294835 328517496";

// const start =
//   "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68..";
// const done =
//   "735148629 621359785 489627513 564873291 193562478 872491356 358214967 946785132 217936845";

const puzzle = BOARD.emptyPuzzle();
const solutions = [solvedFromString(start)];
console.log(puzzle);
while (solutions.length) {
  puzzle.resetSolved();
  const solved = solutions.shift()!;
  console.log(
    "solving",
    solved.size,
    "of",
    81 - puzzle.getTotalKnown(),
    "unknowns"
  );
  for (const [p, k] of solved.randomized()) {
    BOARD.setKnown(puzzle, p, k);
    if (puzzle.getSolved().size) {
      solutions.push(puzzle.getSolved());
    }
    BOARD.printValues(puzzle);
  }

  BOARD.printPossibleCounts(puzzle);
  // ALL_KNOWNS.forEach((k) => b.printPossibles(k));
  break;
}

console.log("still", 81 - puzzle.getTotalKnown(), "unknown");
console.log("done", BOARD.toString(puzzle));
console.log("correct?", done === BOARD.toString(puzzle));

// for (let p of puzzles) {
//   p.printValues();
// }
