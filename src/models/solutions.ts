import { shuffle } from "../utils/collections";

import { ALL_POINTS, Known, Point, UNKNOWN, valueFromString } from "./basics";

const LOG = false;

/**
 * Tracks determined knowns for a set of points.
 */
export class Solutions {
  solutions = new Map<Point, Known>();

  get size(): number {
    return this.solutions.size;
  }

  forEach(callback: (Known: Known, point: Point) => void): void {
    this.solutions.forEach(callback);
  }

  randomized(): [Point, Known][] {
    return shuffle([...this.solutions.entries()]);
  }

  add(point: Point, known: Known): boolean {
    const current = this.solutions.get(point);
    if (known === current) {
      LOG && console.log("SOLVE", point.k, "=>", known, "DUPE");
      return false;
    } else if (current) {
      LOG && console.log("SOLVE", point.k, "=>", known, "x", current);
    } else {
      LOG && console.log("SOLVE", point.k, "=>", known);
    }

    this.solutions.set(point, known);
    return true;
  }

  remove(point: Point): boolean {
    if (!this.solutions.has(point)) {
      return false;
    }

    // LOG && console.log("REMOVE SOLVED", point.k, "=>", this.solutions.get(point));
    this.solutions.delete(point);
    return true;
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
  const solved = new Solutions();

  for (const p of ALL_POINTS) {
    const value = valueFromString(values.charAt(10 * p.r + p.c));
    if (value !== UNKNOWN) {
      solved.add(p, value);
    }
  }

  return solved;
}
