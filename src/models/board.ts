/*
 * Defines the structure of a standard Sudoku board.
 */

/**
 * Identifies a row, column, or block (numbered left-to-right, top-to-bottom)
 */
export type Coord = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const coords: Coord[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Returns the coordinate as the correct type if it is valid.
 *
 * @throws {Error} If the coordinate is outside the board
 */
function coord(value: number, type: string): Coord {
  if (value < 0 || 8 < value) {
    throw new Error(`Invalid ${type} (${value})`);
  }
  return value as Coord;
}

/**
 * Identifies a single cell on the board.
 */
export type Point = { x: Coord; y: Coord; b: Coord; k: string };

/**
 * All points indexed by their coordinates, row then column.
 */
const pointsByRowCol: Point[][] = coords.reduce(
  (itemRows: Point[][], y: Coord) => [
    ...itemRows,
    coords.reduce(
      (items: Point[], x: Coord) => [
        ...items,
        {
          x,
          y,
          b: coord(3 * Math.floor(y / 3) + Math.floor(x / 3), "b"),
          k: [x, y].join(","),
        },
      ],
      []
    ),
  ],
  []
);

/**
 * All points from left-to-right, top-to-bottom.
 */
const points: Point[] = coords.reduce(
  (points: Point[], y: Coord) => [
    ...points,
    ...coords.reduce(
      (points: Point[], x: Coord) => [...points, getPoint(x, y)],
      []
    ),
  ],
  []
);

/**
 * Returns the unique point instance for the given coordinates.
 */
function getPoint(x: Coord, y: Coord): Point {
  return pointsByRowCol[y]![x]!;
}

/**
 * Returns a point relative to another.
 *
 * @throws {Error} If the new coordinates are outside the board
 */
function delta({ x, y }: Point, dx: number, dy: number): Point {
  return getPoint(coord(x + dx, "x"), coord(y + dy, "y"));
}

/**
 * Returns a new list of points without any duplicates.
 */
function uniquePoints(points: Point[]): Point[] {
  const seen = [
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false],
  ];
  return points.filter(({ x, y }) => {
    if (seen[y]![x]!) {
      return false;
    }
    seen[y]![x] = true;
    return true;
  });
}

enum Grouping {
  ROW,
  COLUMN,
  BLOCK,
}

/**
 * Holds the points that make up one of the three group types.
 */
abstract class Group {
  grouping: Grouping;
  coord: Coord;

  topLeft: Point;
  points: Point[];

  constructor(grouping: Grouping, coord: Coord, points: Point[]) {
    this.grouping = grouping;
    this.coord = coord;
    this.topLeft = points[0]!;
    this.points = points;
  }
}

class Row extends Group {
  constructor(y: Coord) {
    super(
      Grouping.ROW,
      y,
      coords.reduce(
        (points: Point[], x: Coord) => [...points, getPoint(x, y)],
        []
      )
    );
  }
}

class Column extends Group {
  constructor(x: Coord) {
    super(
      Grouping.COLUMN,
      x,
      coords.reduce(
        (points: Point[], y: Coord) => [...points, getPoint(x, y)],
        []
      )
    );
  }
}

class Block extends Group {
  constructor(b: Coord) {
    const topLeft = getPoint(
      coord(3 * (b % 3), "x"),
      coord(3 * Math.floor(b / 3), "y")
    );
    super(
      Grouping.BLOCK,
      b,
      blockDeltas.reduce(
        (points: Point[], [dx, dy]) => [...points, delta(topLeft, dx, dy)],
        []
      )
    );
  }
}

/**
 * Delta values as [dx, dy] from the top-left cell in a block that identify its cells.
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
class Cell {
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
  cells: Map<Point, Cell>;

  constructor() {
    this.rows = coords.map((y) => new Row(y));
    this.columns = coords.map((x) => new Column(x));
    this.blocks = coords.map((b) => new Block(b));
    this.cells = points.reduce(
      (map, p) =>
        map.set(
          p,
          new Cell(p, this.rows[p.y]!, this.columns[p.x]!, this.blocks[p.b]!)
        ),
      new Map<Point, Cell>()
    );
  }
}

export const board = new Board();
