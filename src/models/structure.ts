/*
 * Defines the structure of a standard Sudoku board.
 */

import { singleSetValue } from "../utils/collections";

import {
  ALL_COORDS,
  ALL_KNOWNS,
  ALL_POINTS,
  Coord,
  coord,
  delta,
  getPoint,
  Known,
  Point,
  PointSet,
  stringFromKnownSet,
  UNKNOWN,
} from "./basics";
import { ReadableState, State } from "./state";

const LOG = false;

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

/**
 * Implemented by all trackers that manipulate their own state.
 */
interface Stateful {
  addEmptyState(state: State): void;
}

/**
 * Receives notification when one of its cells is set to a known value.
 */
interface SetKnownListener {
  /**
   * Called when a cell we're interested in is set to a known value.
   */
  onSetKnown(state: State, point: Point, known: Known): Set<Point>;
}

/**
 * Tracks the possible known values for some structure.
 */
interface PossibleKnownsTracker {
  /**
   * Removes the given known as a possible value for a set of points,
   * triggering actions when there is one and/or no value left.
   */
  removePossibleKnown(state: State, known: Known): boolean;
}

/**
 * Tracks the possible points for each known value for some structure.
 */
interface PossibleKnownPointsTracker {
  /**
   * Removes the given point as a possible location for the given known for a set of points,
   * triggering actions when there is one and/or no point left.
   */
  removePossiblePoint(state: State, known: Known, point: Point): boolean;
}

/**
 * Adds point set operations to a base tracker for creating disjoints.
 */
abstract class PointSetTracker {
  protected readonly board: Board; // TODO Unused
  readonly points: PointSet;

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

  toString(): string {
    return this.points.toString();
  }
}

/**
 * Tracks an individual cell's possible known values (pencil marks).
 *
 * When it has one remaining possible known value, it adds it as the solution for itself.
 * When it is set to a known value, it notifies its containing groups and all neighbors.
 */
class CellTracker implements PossibleKnownsTracker, Stateful {
  private readonly board: Board;
  private readonly point: Point;

  private readonly row: RowTracker;
  private readonly column: ColumnTracker;
  private readonly block: BlockTracker;

  // private readonly knownTrackers: PossibleKnownsTracker[] = [];
  private readonly pointTrackers: PossibleKnownPointsTracker[] = [];

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
    // this.addKnownTracker(row);
    // this.addKnownTracker(column);
    // this.addKnownTracker(block);
    this.addPointTracker(row);
    this.addPointTracker(column);
    this.addPointTracker(block);
  }

  // addKnownTracker(tracker: PossibleKnownsTracker) {
  //   this.knownTrackers.push(tracker);
  // }

  addPointTracker(tracker: PossibleKnownPointsTracker) {
    this.pointTrackers.push(tracker);
  }

  addEmptyState(state: State): void {
    state.setValueUnknown(this.point);
    state.setPossibleKnownsToAll(this.point);
  }

  getNeighbors(): PointSet {
    const union = this.block.union(this.row.union(this.column));
    union.delete(this.point);
    return union;
  }

  setKnown(state: State, known: Known): boolean {
    const point = this.point;
    const previous = state.getValue(point);
    if (previous === known) {
      return false;
    }

    if (previous === UNKNOWN) {
      console.log("set", point.k, "=>", known);
    } else {
      console.log("set", point.k, "=>", known, "x", previous);
      return false;
    }
    state.removeSolved(point);
    state.setValue(point, known);

    // does not trigger last-point solution
    const pointsToNotify = new PointSet([
      ...this.row.onSetKnown(state, point, known),
      ...this.column.onSetKnown(state, point, known),
      ...this.block.onSetKnown(state, point, known),
    ]);
    LOG && console.log("notify remove", known, pointsToNotify);
    const cellsToNotify = BOARD.getCells(pointsToNotify);
    // this.row.removePossibleKnown(state, known);
    // this.column.removePossibleKnown(state, known);
    // this.block.removePossibleKnown(state, known);

    for (const c of cellsToNotify) {
      c.removePossibleKnown(state, known);
    }

    // clear known and possible points from row, column, block,
    //   collecting possible points from each in a set (neighbors),
    //   preventing "last known point" trigger in next step,
    //   tho that solved point is removed when it's removed as a apossible.
    //
    // remove those points as possibles from state
    //   triggering last-point in other groups and no-points in disjoints.
    //
    // remove other knowns from this point, allowing all triggers.

    return true;
  }

  removePossibleKnown(state: State, known: Known): boolean {
    if (
      state.isSolved(this.point) ||
      !state.isPossibleKnown(this.point, known)
    ) {
      return false;
    }

    LOG && console.log("remove", this.point.k, "x", known);
    const remaining = state.removePossibleKnown(this.point, known);
    if (remaining.size === 1) {
      LOG &&
        console.log("solve", this.point.k, "=>", singleSetValue(remaining));
      state.addSolved(this.point, singleSetValue(remaining));
    }

    for (const t of this.pointTrackers) {
      t.removePossiblePoint(state, known, this.point);
    }

    return true;
  }

  toString(): string {
    return `Cell ${this.point.k}`;
  }
}

/**
 * Base tracker for a point set and which are still possible for each known value.
 *
 * FACTOR Track by point set so readers can inspect using Board.getRowPoints(r: Coord), etc?
 */
abstract class AbstractPossibleKnownPointsTracker
  extends PointSetTracker
  implements PossibleKnownPointsTracker, Stateful
{
  constructor(board: Board, points: PointSet) {
    super(board, points);
  }

  addEmptyState(state: State): void {
    state.setPossiblePointsToAll(this, this.points);
  }

  removePossiblePoint(state: State, known: Known, point: Point): boolean {
    if (!state.isPossiblePoint(this, known, point)) {
      if (this instanceof DisjointTracker) {
        LOG && console.log("not possible", known, point.k, this.toString());
      }
      return false;
    }

    const remaining = state.removePossiblePoint(this, known, point);
    LOG &&
      console.log(
        "remove point",
        known,
        "x",
        point.k,
        "left",
        new PointSet(remaining).toString()
      );
    switch (remaining.size) {
      case 1:
        this.onOnePointLeft(state, known, singleSetValue(remaining));
        break;

      case 0:
        this.onNoPointsLeft(state, known);
        break;
    }

    return true;
  }

  onOnePointLeft(state: State, known: Known, point: Point) {
    // override if necessary
  }

  onNoPointsLeft(state: State, known: Known) {
    // override if necessary
  }
}

/**
 * Base tracker for each row, column, and block.
 */
class GroupTracker
  extends AbstractPossibleKnownPointsTracker
  implements PossibleKnownsTracker, SetKnownListener
{
  coord: Coord;

  constructor(board: Board, points: PointSet, coord: Coord) {
    super(board, points);
    this.coord = coord;
  }

  addEmptyState(state: State): void {
    super.addEmptyState(state);
    state.setPossibleKnownsToAll(this);
  }

  onSetKnown(state: State, point: Point, known: Known): Set<Point> {
    LOG &&
      console.log("known set in group", this.toString(), point.k, "=>", known);
    state.removePossibleKnown(this, known);
    const remaining = state.clearPossiblePoints(this, known);
    for (const k of ALL_KNOWNS) {
      state.removePossiblePoint(this, k, point);
    }
    return remaining;
  }

  // TODO is this even needed? maybe for other solvers
  removePossibleKnown(state: State, known: Known): boolean {
    if (!state.isPossibleKnown(this, known)) {
      return false;
    }

    state.removePossibleKnown(this, known);
    // nothing to trigger; if last known left, it'll get solved by the cell tracker

    return true;
  }

  onOnePointLeft(state: State, known: Known, point: Point) {
    LOG && console.log("solve group", this.toString(), point.k, "=>", known);
    state.addSolved(point, known);
  }
}

/**
 * Tracks the possible points per known for a single row.
 */
class RowTracker extends GroupTracker {
  constructor(board: Board, r: Coord) {
    super(board, new PointSet(ALL_COORDS.map((c) => getPoint(r, c))), r);
  }

  toString(): string {
    return `Row ${this.coord + 1} ${super.toString()}`;
  }
}

/**
 * Tracks the possible points per known for a single column.
 */
class ColumnTracker extends GroupTracker {
  constructor(board: Board, c: Coord) {
    super(board, new PointSet(ALL_COORDS.map((r) => getPoint(r, c))), c);
  }

  toString(): string {
    return `Column ${this.coord + 1} ${super.toString()}`;
  }
}

/**
 * Tracks the possible points per known for a single block.
 */
export class BlockTracker extends GroupTracker {
  /**
   * Delta values as [dr, dc] from the top-left cell in a block that identify its cells.
   * The resulting cells will be left-to-right, top-to-bottom.
   */
  static readonly deltas: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ];

  topLeft: Point;

  constructor(board: Board, b: Coord) {
    const topLeft = getPoint(
      coord(3 * Math.floor(b / 3), "r"),
      coord(3 * (b % 3), "c")
    );
    super(
      board,
      new PointSet(
        BlockTracker.deltas.map(([dr, dc]) => delta(topLeft, dr, dc))
      ),
      b
    );
    this.topLeft = topLeft;
  }

  toString(): string {
    return `Block ${this.coord + 1} ${super.toString()}`;
  }
}

/**
 * Removes a given known value from all disjoint cells of another disjoint
 * when that disjoint may no longer contain the known value.
 *
 * For example, when 4 may not appear in the set A, it must be in the set B,
 * and thus may not appear in the disjoint set C, and vice versa.
 *
 *   BBBAAAAAA
 *   CCC
 *   CCC
 *
 * FACTOR Change to one IntersectionTracker per group pair to track both disjoints together
 * FACTOR Implement SetKnownListener
 * TODO Add onSetKnown(): remove known entirely since block/row/column will handle it
 */
class DisjointTracker extends AbstractPossibleKnownPointsTracker {
  private readonly intersection: PointSet;
  private readonly disjointCells: CellTracker[];

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

  onNoPointsLeft(state: State, known: Known): void {
    // LOG &&
    console.log("disjoint empty", this.toString(), "x", known);
    for (const cell of this.disjointCells) {
      cell.removePossibleKnown(state, known);
    }
  }

  toString(): string {
    return `Disjoint ${super.toString()} ${this.intersection.toString()}`;
  }
}

// TODO Add onSetKnown or do it below?
class Disjoint extends AbstractPossibleKnownPointsTracker {
  private readonly intersection: IntersectionTracker;

  constructor(
    intersection: IntersectionTracker,
    board: Board,
    points: PointSet
  ) {
    super(board, points);
    this.intersection = intersection;
  }

  onNoPointsLeft(state: State, known: Known): void {
    this.intersection.onNoPointsLeftInDisjoint(state, known, this);
  }

  toString(): string {
    return `Disjoint ${super.toString()}`;
  }
}

/**
 * Tracks an intersection between a block and a row or column
 * and the subsets of points not in the block, called disjoints.
 *
 * When either disjoint loses the last point for a known,
 * that known is removed as a possible from the other disjoint
 * since it must appear in the intersection.
 *
 * When this happens, or a known is set anywhere in the union,
 * the entire tracker is removed from the state.
 *
 * It does not cause any knowns to be solved by itself.
 *
 * TODO Register with all cells in union to stop tracking the set known?
 */
class IntersectionTracker
  extends AbstractPossibleKnownPointsTracker
  implements SetKnownListener
{
  private readonly block: BlockTracker; // TODO unused
  private readonly group: GroupTracker; // TODO unused
  private readonly blockDisjoint: Disjoint;
  private readonly groupDisjoint: Disjoint;

  constructor(board: Board, block: BlockTracker, group: GroupTracker) {
    const intersection = block.intersect(group);
    super(board, intersection);
    this.block = block;
    this.group = group;
    this.blockDisjoint = new Disjoint(this, board, block.diff(intersection));
    this.groupDisjoint = new Disjoint(this, board, group.diff(intersection));
  }

  onSetKnown(state: State, point: Point, known: Known): Set<Point> {
    if (!state.isPossibleKnown(this, known)) {
      // LOG &&
      console.log(
        "not possible",
        this.toString(),
        "x",
        known,
        "not in",
        stringFromKnownSet(state.getPossibleKnowns(this))
      );
      return new Set();
    }

    const remaining = state.removePossibleKnown(this, known);
    // LOG &&
    console.log(
      "onSetKnown",
      this.toString(),
      "x",
      known,
      "==>",
      stringFromKnownSet(remaining)
    );

    state.clearPossiblePoints(this, known);
    this.stopTrackingDisjoints(state, known);

    return new Set();
  }

  onNoPointsLeftInDisjoint(state: State, known: Known, disjoint: Disjoint) {
    // LOG &&
    console.log("disjoint empty", disjoint.toString(), "x", known);

    const other =
      disjoint === this.blockDisjoint ? this.blockDisjoint : this.groupDisjoint;
    this.stopTrackingDisjoints(state, known);

    // remove known from other's points' cells
    for (const p of other.points) {
      this.board.removePossiblePoint(state, known, p);
    }
  }

  onNoPointsLeft(state: State, known: Known): void {
    // LOG &&
    console.log("intersection empty", this.toString(), "x", known);

    // stop tracking known; it must appear in both disjoints
    state.removePossibleKnown(this, known);
    this.stopTrackingDisjoints(state, known);
  }

  private stopTrackingDisjoints(state: State, known: Known) {
    state.removePossibleKnown(this.blockDisjoint, known);
    state.removePossibleKnown(this.groupDisjoint, known);
    state.clearPossiblePoints(this.blockDisjoint, known);
    state.clearPossiblePoints(this.groupDisjoint, known);
  }

  toString(): string {
    return `Intersection ${super.toString()}`;
  }
}

/**
 * Removes a given known value from all neighbors of a cell when that cell is solved.
 */
class NeighborsTracker implements SetKnownListener {
  private readonly board: Board; // TODO Unused
  private readonly cell: CellTracker;
  private readonly neighbors: PointSet; // FACTOR CellSet or Set<Cell> or Cell[]

  constructor(board: Board, cell: CellTracker, neighbors: PointSet) {
    this.board = board;
    this.neighbors = neighbors;
    this.cell = cell;
  }

  onSetKnown(state: State, point: Point, known: Known): Set<Point> {
    let removed = false;

    LOG && console.log("remove neighbors", known);
    for (const cell of this.board.getCells(this.neighbors)) {
      if (cell.removePossibleKnown(state, known)) {
        removed = true;
      }
    }

    return new Set();
  }

  toString(): string {
    return `Neighbors of ${this.cell.toString()}`;
  }
}

/**
 * Provides access to the cells and related structures that make up a standard Sudoku board.
 */
class Board implements PossibleKnownPointsTracker {
  private readonly cells = new Map<Point, CellTracker>();
  readonly rows = new Map<Coord, RowTracker>();
  readonly columns = new Map<Coord, ColumnTracker>();
  readonly blocks = new Map<Coord, BlockTracker>();

  private readonly statefuls = new Set<Stateful>();

  constructor() {
    this.createGroups();
    this.createCells();
    // this.createNeighbors();
    this.createIntersections();
  }

  private createGroups() {
    ALL_COORDS.forEach((x) => {
      const row = new RowTracker(this, x);
      this.rows.set(x, row);
      this.statefuls.add(row);

      const column = new ColumnTracker(this, x);
      this.columns.set(x, column);
      this.statefuls.add(column);

      const block = new BlockTracker(this, x);
      this.blocks.set(x, block);
      this.statefuls.add(block);
    });
  }

  private createCells() {
    for (const point of ALL_POINTS) {
      const cell = new CellTracker(
        this,
        point,
        this.rows.get(point.r)!,
        this.columns.get(point.c)!,
        this.blocks.get(point.b)!
      );
      this.cells.set(point, cell);
      this.statefuls.add(cell);
    }
  }

  // private createNeighbors() {
  //   this.cells.forEach((cell) =>
  //     cell.addSetKnownListener(
  //       new NeighborsTracker(this, cell, cell.getNeighbors())
  //     )
  //   );
  // }

  private createIntersections() {
    // this.createDisjoints(
    //   this.blocks.get(1)!,
    //   new Map<Coord, GroupTracker>([[coord(1, "r"), this.rows.get(3)!]])
    // );
    // return;
    // this.blocks.forEach((block) => {
    //   this.createDisjoints(block, this.rows);
    //   this.createDisjoints(block, this.columns);
    // });
    this.blocks.forEach((block) => {
      for (const row of this.rows.values()) {
        this.statefuls.add(new IntersectionTracker(this, block, row));
      }
      for (const column of this.columns.values()) {
        this.statefuls.add(new IntersectionTracker(this, block, column));
      }
    });
  }

  private createDisjoints(
    block: BlockTracker,
    groups: Map<Coord, GroupTracker>
  ) {
    groups.forEach((group) => {
      const intersection = block.intersect(group);
      if (!intersection.size) {
        return;
      }

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
    });
  }

  getCells(points: PointSet): CellTracker[] {
    return [...points.values()].map((p) => this.cells.get(p)!);
  }

  getRowPoints(r: Coord): PointSet {
    return this.rows.get(r)!.points;
  }

  getColumnPoints(c: Coord): PointSet {
    return this.columns.get(c)!.points;
  }

  getBlockPoints(b: Coord): PointSet {
    return this.blocks.get(b)!.points;
  }

  setKnown(state: State, point: Point, known: Known): boolean {
    return this.cells.get(point)!.setKnown(state, known);
  }

  removePossiblePoint(state: State, known: Known, point: Point): boolean {
    return this.cells.get(point)!.removePossibleKnown(state, known);
  }

  setupEmptyState(state: State): void {
    for (const s of this.statefuls) {
      s.addEmptyState(state);
    }
  }

  toString(state: ReadableState): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = state.getValue(getPoint(r, c));
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    ).join(" ");
  }

  validate(state: ReadableState): boolean {
    let valid = true;

    for (const p of ALL_POINTS) {
      const value = state.getValue(p);
      if (value === UNKNOWN) {
        continue;
      }

      // TODO Should the cell keep its solved value as its only possible known?
      const cell = this.cells.get(p)!;
      if (state.getPossibleKnowns(p).size) {
        console.log(
          "INVALID",
          p.k,
          "=",
          value,
          cell.toString(),
          "knowns",
          state.getPossibleKnowns(p)
        );
        valid = false;
      }

      [
        this.rows.get(p.r)!,
        this.columns.get(p.c)!,
        this.blocks.get(p.b)!,
      ].forEach((group) => {
        if (state.isPossibleKnown(group, value)) {
          console.log(
            "INVALID",
            p.k,
            "=",
            value,
            group.toString(),
            "knowns",
            state.getPossibleKnowns(p)
          );
          valid = false;
        }
        const possibles = state.getPossiblePoints(group, value);
        if (
          possibles.size > 1 ||
          !(possibles.size === 1 || !possibles.has(p))
        ) {
          console.log(
            "INVALID",
            p.k,
            "=",
            value,
            group.toString(),
            "points",
            new PointSet(possibles).toString()
          );
          valid = false;
        }
      });
    }

    return valid;
  }
}

export const BOARD = new Board();
