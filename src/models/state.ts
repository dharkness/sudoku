import {
  ALL_KNOWNS,
  ALL_POINTS,
  Known,
  Point,
  PointSet,
  stringFromKnownSet,
  UNKNOWN,
  Value,
} from "./basics";
import { Solutions } from "./solutions";
import { BOARD } from "./structure";
import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Exposes only the methods required to inspect the puzzle state.
 */
export interface ReadableState {
  isSolved(point?: Point): boolean;
  getTotalSolved(): number;

  getValue(point: Point): Value;
  getPossibleKnownsCount(owner: any): number;
  isPossibleKnown(owner: any, known: Known): boolean;
  getPossibleKnowns(owner: any): Set<Known>;

  isPossiblePoint(owner: any, known: Known, point: Point): boolean;
  getPossiblePoints(owner: any, known: Known): Set<Point>;
}

/**
 * Adds methods for trackers to modify the puzzle state.
 */
export interface State extends ReadableState {
  setValueUnknown(point: Point): void;
  setValue(point: Point, value: Value): void;

  setPossibleKnownsToAll(owner: any): void;
  removePossibleKnown(owner: any, known: Known): Set<Known>;
  clearPossibleKnowns(owner: any): void;

  setPossiblePointsToAll(owner: any, points: PointSet): void;
  removePossiblePoint(owner: any, known: Known, point: Point): Set<Point>;
  clearPossiblePoints(owner: any, known: Known): Set<Point>;

  // FACTOR Move Solved to Context { Board, State, Solved }
  getSolved(): Solutions;
  addSolved(point: Point, known: Known): void;
  removeSolved(point: Point): void;
  clearSolved(): void;
}

/**
 * Allows in-place editing of the puzzle state.
 */
export class SimpleState implements State {
  private values = new Map<Point, Value>();
  private possibleKnowns = new Map<any, Set<Known>>();
  private possiblePoints = new Map<any, Map<Known, Set<Point>>>();

  // private possibleKnownsByKnown = new Map<Known, Set<any>>();
  private possiblePointsByPoint = new Map<Known, Map<Point, Set<any>>>();

  private solved = new Solutions();

  constructor() {
    for (const k of ALL_KNOWNS) {
      this.possiblePointsByPoint.set(
        k,
        new Map(ALL_POINTS.map((p) => [p, new Set()]))
      );
    }
  }

  isSolved(point?: Point): boolean {
    if (point) {
      return this.values.get(point) !== UNKNOWN;
    } else {
      let all = true;
      this.values.forEach((value) => (all &&= value !== UNKNOWN));
      return all;
    }
  }
  getTotalSolved(): number {
    let count = 0;
    this.values.forEach((value) => {
      if (value !== UNKNOWN) {
        count += 1;
      }
    });
    return count;
  }

  setValueUnknown(point: Point): void {
    this.values.set(point, UNKNOWN);
  }
  getValue(point: Point): Value {
    return this.values.get(point)!;
  }
  // FIXME Change to setKnown(Point, Known)
  setValue(point: Point, value: Value): void {
    if (this.values.get(point) === value) {
      return;
    }

    // for every container of this point for the known
    //   for every point in the container still possible
    //     remove it as a possible for all other containers
    LOG && console.log("STATE SET VALUE", value, point.k);
    this.values.set(point, value);
    this.clearPossibleKnowns(point);
    // FIXME Makes state invalid
    // for (const k of ALL_KNOWNS) {
    //   for (const [p, owners] of this.possiblePointsByPoint.get(k)!) {
    //     for (const o of owners) {
    //       const points = this.possiblePoints.get(o)!.get(k)!;
    //       points.delete(p);
    //       switch (points.size) {
    //         case 0:
    //           // o.onNoPointsLeft(this, k);
    //           break;
    //         case 1:
    //           // o.onOnePointLeft(this, k, singleSetValue(points));
    //           break;
    //       }
    //     }
    //     owners.clear();
    //   }
    // }
  }

  setPossibleKnownsToAll(owner: any): void {
    this.possibleKnowns.set(owner, new Set(ALL_KNOWNS));
  }
  getPossibleKnownsCount(owner: any): number {
    return this.possibleKnowns.get(owner)?.size ?? 0;
  }
  isPossibleKnown(owner: any, known: Known): boolean {
    return this.possibleKnowns.get(owner)?.has(known) ?? false;
  }
  getPossibleKnowns(owner: any): Set<Known> {
    return this.possibleKnowns.get(owner) || new Set();
  }
  removePossibleKnown(owner: any, known: Known): Set<Known> {
    const knowns = this.possibleKnowns.get(owner);
    if (knowns?.has(known)) {
      knowns.delete(known);
      LOG &&
        console.log(
          "STATE REMOVE KNOWN",
          known,
          owner.k || owner.toString(),
          "==>",
          stringFromKnownSet(knowns)
        );
    }
    return knowns ?? new Set();
  }
  clearPossibleKnowns(owner: any): void {
    LOG &&
      console.log(
        "STATE CLEAR KNOWNS",
        owner.k || owner.toString(),
        "x",
        stringFromKnownSet(this.possibleKnowns.get(owner)!)
      );
    this.possibleKnowns.set(owner, new Set());
  }

  setPossiblePointsToAll(owner: any, points: PointSet): void {
    this.possiblePoints.set(
      owner,
      new Map(ALL_KNOWNS.map((k) => [k, new Set(points)]))
    );
    for (const k of ALL_KNOWNS) {
      for (const p of points) {
        this.possiblePointsByPoint.get(k)!.get(p)!.add(owner);
      }
    }
  }
  isPossiblePoint(owner: any, known: Known, point: Point): boolean {
    return this.possiblePoints.get(owner)?.get(known)?.has(point) ?? false;
  }
  getPossiblePoints(owner: any, known: Known): Set<Point> {
    return this.possiblePoints.get(owner)?.get(known) ?? new Set();
  }
  removePossiblePoint(owner: any, known: Known, point: Point): Set<Point> {
    const owners = this.possiblePointsByPoint.get(known)!.get(point)!;
    if (!owners.has(owner)) {
      return new Set();
    }
    owners.delete(owner);
    const points = this.possiblePoints.get(owner)?.get(known);
    if (points?.has(point)) {
      points.delete(point);
      LOG &&
        console.log(
          "STATE REMOVE POINT",
          known,
          point.k,
          owner.toString(),
          "==>",
          new PointSet(points).toString()
        );
    }
    return points ?? new Set();
  }
  clearPossiblePoints(owner: any, known: Known): Set<Point> {
    const knowns = this.possiblePoints.get(owner)!;
    const points = knowns.get(known)!;
    if (!points.size) {
      return points;
    }

    LOG &&
      console.log(
        "STATE CLEAR POINTS",
        known,
        owner.k || owner.toString(),
        "x",
        new PointSet(points).toString()
      );
    knowns.set(known, new Set());
    const owners = this.possiblePointsByPoint.get(known)!;
    for (const p of points.values()) {
      owners.get(p)!.delete(owner);
    }

    return points;
  }

  clearSolved(): void {
    this.solved = new Solutions();
  }
  getSolved(): Solutions {
    return this.solved;
  }
  addSolved(point: Point, known: Known): void {
    this.solved.add(point, known);
  }
  removeSolved(point: Point): void {
    this.solved.remove(point);
  }
}

export function createEmptySimpleState(): State {
  const state = new SimpleState();
  BOARD.setupEmptyState(state);
  console.log(state);
  return state;
}

// TODO Add CopyOnWriteState
