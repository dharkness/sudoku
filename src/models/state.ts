import { ALL_KNOWNS, Known, Point, PointSet, UNKNOWN, Value } from "./basics";
import { Solutions } from "./solutions";
import { BlockTracker, BOARD } from "./structure";

const LOG = true;

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

  private solved = new Solutions();

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
  setValue(point: Point, value: Value): void {
    LOG && console.log("STATE SET VALUE", value, point.k);
    this.values.set(point, value);
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
      LOG &&
        console.log("STATE REMOVE KNOWN", known, owner.k || owner.toString());
      knowns.delete(known);
    }
    return knowns ?? new Set();
  }
  clearPossibleKnowns(owner: any): void {
    LOG && console.log("STATE CLEAR KNOWNS", owner.k || owner.toString());
    this.possibleKnowns.set(owner, new Set());
  }

  setPossiblePointsToAll(owner: any, points: PointSet): void {
    this.possiblePoints.set(
      owner,
      new Map(ALL_KNOWNS.map((k) => [k, new Set(points)]))
    );
  }
  isPossiblePoint(owner: any, known: Known, point: Point): boolean {
    return this.possiblePoints.get(owner)?.get(known)?.has(point) ?? false;
  }
  getPossiblePoints(owner: any, known: Known): Set<Point> {
    return this.possiblePoints.get(owner)?.get(known)!; // ?? new Set();
  }
  removePossiblePoint(owner: any, known: Known, point: Point): Set<Point> {
    const points = this.possiblePoints.get(owner)?.get(known);
    if (points?.has(point)) {
      LOG &&
        console.log("STATE REMOVE POINT", known, point.k, owner.toString());
      points.delete(point);
    }
    return points ?? new Set();
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
  return state;
}

// TODO Add CopyOnWriteState
