/*
 * Defines the structure of a standard Sudoku board.
 */

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
export function pointGroupCoordsToString(
  g: Grouping,
  points: Set<Point>
): string {
  const coords = new Set<Coord>(Array.from(points.values()).map((p) => p.i[g]));
  return ALL_COORDS.map((c) => (coords.has(c) ? (c + 1).toString() : ".")).join(
    ""
  );
}

/**
 * Holds the points that make up one of the three group types.
 */
abstract class Group {
  grouping: Grouping;
  coord: Coord;

  topLeft: Point;
  points: Point[];

  protected constructor(grouping: Grouping, coord: Coord, points: Point[]) {
    this.grouping = grouping;
    this.coord = coord;
    this.topLeft = points[0]!;
    this.points = points;
  }
}

class Row extends Group {
  constructor(r: Coord) {
    super(
      Grouping.ROW,
      r,
      ALL_COORDS.reduce(
        (points: Point[], c: Coord) => [...points, getPoint(r, c)],
        []
      )
    );
  }
}

class Column extends Group {
  constructor(c: Coord) {
    super(
      Grouping.COLUMN,
      c,
      ALL_COORDS.reduce(
        (points: Point[], r: Coord) => [...points, getPoint(r, c)],
        []
      )
    );
  }
}

class Block extends Group {
  constructor(b: Coord) {
    const topLeft = getPoint(
      coord(3 * Math.floor(b / 3), "r"),
      coord(3 * (b % 3), "c")
    );
    super(
      Grouping.BLOCK,
      b,
      blockDeltas.reduce(
        (points: Point[], [dc, dr]) => [...points, delta(topLeft, dc, dr)],
        []
      )
    );
  }
}

/**
 * Delta values as [dc, dr] from the top-left cell in a block that identify its cells.
 * The resulting cells will be left-to-right, top-to-bottom.
 */
const blockDeltas: [number, number][] = [
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

/**
 * Identifies a single unique cell and every other structure it touches.
 */
export class Cell {
  point: Point;
  row: Row;
  column: Column;
  block: Block;
  neighbors: Point[];

  constructor(point: Point, row: Row, column: Column, block: Block) {
    this.point = point;
    this.row = row;
    this.column = column;
    this.block = block;
    this.neighbors = uniquePoints([
      point,
      ...this.row.points,
      ...this.column.points,
      ...this.block.points,
    ]).slice(1);
  }
}

/**
 * Provides access to the cells and related structures that make up a standard Sudoku board.
 */
class Board {
  rows: Row[];
  columns: Column[];
  blocks: Block[];

  groups: Group[][];
  cells: Map<Point, Cell>;

  constructor() {
    this.rows = ALL_COORDS.map((r) => new Row(r));
    this.columns = ALL_COORDS.map((c) => new Column(c));
    this.blocks = ALL_COORDS.map((b) => new Block(b));

    this.groups = [this.rows, this.columns, this.blocks];
    this.cells = new Map<Point, Cell>();
    for (const r of ALL_COORDS) {
      for (const c of ALL_COORDS) {
        const point = getPoint(r, c);
        this.cells.set(
          point,
          new Cell(
            point,
            this.rows[r]!,
            this.columns[c]!,
            this.blocks[point.b]!
          )
        );
      }
    }
  }
}

export const BOARD = new Board();
