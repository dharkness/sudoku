// ========== COORDS ============================================================ //

const MISSING = "·";

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

// ========== POINTS ============================================================ //

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
          i: [c, r, coord(3 * (r % 3) + (c % 3), "bc")],
          k: `${r + 1}${c + 1}`,
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
export function delta({ r, c }: Point, dr: number, dc: number): Point {
  return getPoint(coord(r + dr, "r"), coord(c + dc, "c"));
}

/**
 * Returns a new list of points without any duplicates.
 */
export function uniquePoints(points: Point[]): Point[] {
  return Array.from(new Set<Point>(points));
}

/**
 * Returns a human-readable string representation of a set of points.
 */
export function stringFromPointSet(points: Set<Point>): string {
  return "( " + [...points.values()].map((point) => point.k).join(" ") + " )";
}

/**
 * Adds set operations to a set of points.
 *
 * FACTOR Use a mixin to add this functionality to any set?
 */
export class PointSet extends Set<Point> {
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

  toString(): string {
    return "( " + [...this.values()].map((p) => p.k).join(" ") + " )";
  }
}

// ========== GROUPINGS ============================================================ //

export enum Grouping {
  ROW,
  COLUMN,
  BLOCK,
}

export const ALL_GROUPINGS: Grouping[] = [
  Grouping.ROW,
  Grouping.COLUMN,
  Grouping.BLOCK,
];

/**
 * Returns a string containing nine slots, each showing the slot's coordinate
 * if any point in the set matches it or a period otherwise.
 */
export function stringFromPointGroupCoords(
  g: Grouping,
  points: Set<Point>
): string {
  const coords = new Set<Coord>(Array.from(points.values()).map((p) => p.i[g]));
  return ALL_COORDS.map((c) =>
    coords.has(c) ? (c + 1).toString() : MISSING
  ).join("");
}

// ========== VALUES ============================================================ //

/**
 * Identifies a value to track known and candidate values.
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
export function known(value: number): Known {
  if (value < 1 || 9 < value) {
    throw new Error(`Invalid cell value (${value})`);
  }
  return value as Known;
}

/**
 * Returns the value from a single-character string.
 */
export function valueFromString(char: string): Value {
  return "1" <= char && char <= "9" ? known(parseInt(char)) : UNKNOWN;
}

/**
 * Returns a string form of a set of knowns.
 */
export function stringFromKnownSet(knowns: Set<Known>): string {
  return `( ${ALL_KNOWNS.map((k) =>
    knowns.has(k) ? k.toString() : MISSING
  ).join(" ")} )`;
}

/**
 * Returns a stable key for a set of knowns.
 */
export function keyFromKnownSet(knowns: Set<Known>): string {
  return [...knowns].sort((a, b) => a - b).join(",");
}

/**
 * Used to mark cells that are not yet known.
 */
export const UNKNOWN = null;
export type Unknown = null;
export type Value = Known | Unknown;

/**
 * Returns true if any cell in the test string doesn't match the solution.
 */
export function isCorrectSoFar(test: string, solution: string): boolean {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t !== s && "1" <= t && t <= "9" && "1" <= s && s <= "9") {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if the test full matches the solution.
 */
export function isFullyCorrect(test: string, solution: string): boolean {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t !== s && "1" <= s && s <= "9") {
      return false;
    }
  }

  return true;
}

/**
 * Compare two solved known strings and return the differences as a string.
 */
export function solutionDiff(test: string, solution: string): string {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  let result = "";
  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t === s || t < "1" || "9" < t || s < "1" || "9" < s) {
      result += MISSING;
    } else {
      result += "x";
    }
  }

  return result;
}
