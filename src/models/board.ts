/*
 * Functions to modify a board.
 */

export type Coord = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Point = { row: Coord; col: Coord };

export const UNKNOWN = null;
export type Unknown = null;
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type Known = Digit | Unknown;
type Possible = Set<Digit>;

type Group<T> = [T, T, T, T, T, T, T, T, T];
type Groups<T> = [
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>,
  Group<T>
];

export interface Board {
  cells: Groups<Cell>;
}

interface Cell {
  point: Point;
  known: Known;
  possible: Possible;
}

export interface Changes {
  before: Board;
  after: Board;

  knowns: Map<Point, Known>;
  possibles: Map<Point, Known[]>;
}

export function setKnown(board: Board, digit: Digit, point: Point) {
  //...
}

function copyAndSetKnown(board: Board, known: Known, point: Point) {
  const { row, col } = point;

  if (board.cells[row][col].known !== known) {
    const after = { ...board };

    after.cells = [...after.cells];
    after.cells[row] = [...after.cells[row]];
    after.cells[row][col] = { ...after.cells[row][col], known };
  }
}

class ModifiableBoard {
  board: Board;

  unlockedBoard = false;
  unlockedKnown = false;
  unlockedRows = new Set<Coord>();
  unlockedCells = new Map<Coord, Set<Coord>>();

  constructor(board: Board) {
    this.board = board;
  }

  getCell({ row, col }: Point): Cell {
    return this.board.cells[row][col];
  }

  getKnown(point: Point): Known {
    return this.getCell(point).known;
  }

  setKnown(point: Point, known: Known): boolean {
    const previous = this.getKnown(point);
    if (previous === known) {
      return false;
    }

    this.unlockCell(point);
    this.board.cells[point.row][point.col] = {
      ...this.board.cells[point.row][point.col],
      known,
      possible:
        known === UNKNOWN ? this.getAllActuallyPossible(point) : new Set(),
    };

    const { row, col } = point;
    const positions = touchedCellsByRowCol[row]![col]!;
    const changes: Point[] = [];
    if (known !== UNKNOWN) {
      positions.forEach((point) => {
        if (this.removePossible(point, known)) {
          changes.push(point);
        }
      });
      console.log("clear", point, previous);
      console.dir(changes);
    } else if (previous !== UNKNOWN) {
      positions.forEach((point) => {
        if (
          this.isActuallyPossible(point, previous) &&
          this.addPossible(point, previous)
        ) {
          changes.push(point);
        }
      });
      console.log("set", point, known);
      console.dir(changes);
    } else {
      throw new Error(`Invalid known ${previous}`);
    }

    return true;
  }

  isPossible(point: Point, digit: Digit) {
    return this.getCell(point).possible.has(digit);
  }

  isActuallyPossible({ row, col }: Point, digit: Digit): boolean {
    for (const point of touchedCellsByRowCol[row]![col]!) {
      if (this.getKnown(point) === digit) {
        return false;
      }
    }

    return true;
  }

  getAllActuallyPossible({ row, col }: Point): Set<Digit> {
    const possible = new Set(digits);
    for (const point of touchedCellsByRowCol[row]![col]!) {
      const known = this.getKnown(point);
      if (known !== UNKNOWN) {
        possible.delete(known);
      }
    }

    return possible;
  }

  addPossible(point: Point, digit: Digit): boolean {
    if (this.getCell(point).possible.has(digit)) {
      return false;
    }

    this.unlockCell(point);
    const cell = this.getCell(point);
    cell.possible = new Set(cell.possible);
    cell.possible.add(digit);

    return true;
  }

  removePossible(point: Point, digit: Digit): boolean {
    if (!this.getCell(point).possible.has(digit)) {
      return false;
    }

    this.unlockCell(point);
    const cell = this.getCell(point);
    cell.possible = new Set(cell.possible);
    cell.possible.delete(digit);

    return true;
  }

  unlockBoard() {
    if (!this.unlockedBoard) {
      this.board = { ...this.board };
      this.unlockedBoard = true;
    }
  }

  unlockCells() {
    if (!this.unlockedKnown) {
      this.unlockBoard();
      this.board.cells = [...this.board.cells];
      this.unlockedKnown = true;
    }
  }

  unlockRow(row: Coord) {
    if (!this.unlockedRows.has(row)) {
      this.unlockCells();
      this.board.cells[row] = [...this.board.cells[row]];
      this.unlockedRows.add(row);
    }
  }

  unlockCell({ row, col }: Point) {
    const cells = this.unlockedCells.get(row);
    if (!cells) {
      this.unlockRow(row);
      this.unlockedCells.set(row, new Set([col]));
    } else if (!cells.has(col)) {
      cells.add(col);
    } else {
      return;
    }
    this.board.cells[row][col] = { ...this.board.cells[row][col] };
  }

  printKnowns() {
    indexes.forEach((row) =>
      console.log(
        row + 1,
        indexes
          .reduce((cells: string[], col) => {
            const known = this.getCell(getPoint(row, col)).known;
            return [...cells, known === UNKNOWN ? "." : known.toString()];
          }, [])
          .join("")
      )
    );
  }

  printPossibleCounts() {
    indexes.forEach((row) =>
      console.log(
        row + 1,
        indexes
          .reduce((cells: string[], col) => {
            const count = this.getCell(getPoint(row, col)).possible.size;
            return [...cells, count ? count.toString() : "."];
          }, [])
          .join("")
      )
    );
  }

  printPossibles(digit: Digit) {
    indexes.forEach((row) =>
      console.log(
        row + 1,
        indexes
          .reduce((cells: string[], col) => {
            const possible = this.getCell(getPoint(row, col)).possible.has(
              digit
            );
            return [...cells, possible ? digit.toString() : "."];
          }, [])
          .join("")
      )
    );
  }
}

function emptyBoard(): Board {
  return {
    cells: everyCell<Cell>((point) => ({
      point,
      known: UNKNOWN,
      possible: new Set(digits),
    })) as Groups<Cell>,
  };
}

function uniqueCells(cells: Point[]): Point[] {
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
  return cells.filter(({ row, col }) => {
    if (seen[row]![col]!) {
      return false;
    }
    seen[row]![col] = true;
    return true;
  });
}

function rowCells({ row, col }: Point, include = false): Point[] {
  return indexes.reduce(
    (cells: Point[], c: Coord) =>
      include || c !== col ? [...cells, { row, col: c }] : cells,
    []
  );
}

function colCells({ row, col }: Point, include = false): Point[] {
  return indexes.reduce(
    (cells: Point[], r: Coord) =>
      include || r !== row ? [...cells, { row: r, col }] : cells,
    []
  );
}

function blockCells({ row, col }: Point, include = false): Point[] {
  const block = (3 * Math.floor(row / 3) + Math.floor(col / 3)) as Coord;
  let cells = cellsByBlock[block];
  if (!cells) {
    throw new Error(`Invalid cell (${row}, ${col})`);
  }

  return include
    ? cells
    : cells.filter(({ row: r, col: c }) => r != row || c != col);
}

function touchedCells(point: Point, include = false): Point[] {
  const touched = uniqueCells([
    ...rowCells(point),
    ...colCells(point),
    ...blockCells(point),
  ]);
  return include ? [point, ...touched] : touched;
}

function everyCell<T>(factory: (point: Point) => T): T[][] {
  return indexes.reduce(
    (itemRows: T[][], row: Coord) => [
      ...itemRows,
      indexes.reduce(
        (items: T[], col: Coord) => [...items, factory(getPoint(row, col))],
        []
      ),
    ],
    []
  );
}

function coord(value: number, type: string): Coord {
  if (value < 0 || 8 < value) {
    throw new Error(`Invalid ${type} (${value})`);
  }
  return value as Coord;
}

function getPoint(row: Coord, col: Coord): Point {
  return { row, col };
}

function delta({ row, col }: Point, addRow: number, addCol: number): Point {
  return getPoint(coord(row + addRow, "row"), coord(col + addCol, "col"));
}

const digits: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const indexes: Coord[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const topLeftCellsByBlock = [
  getPoint(0, 0),
  getPoint(0, 3),
  getPoint(0, 6),
  getPoint(3, 0),
  getPoint(3, 3),
  getPoint(3, 6),
  getPoint(6, 0),
  getPoint(6, 3),
  getPoint(6, 6),
];
const cellsByBlock = topLeftCellsByBlock.reduce(
  (blocks: Point[][], topLeft) => [
    ...blocks,
    (
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
      ] as [number, number][]
    ).reduce(
      (cells: Point[], [addRow, addCol]) => [
        ...cells,
        delta(topLeft, addRow, addCol),
      ],
      []
    ),
  ],
  []
);
const pointsByCoords = everyCell((p) => p);
const touchedCellsByRowCol = everyCell((p) => touchedCells(p));

// console.dir(rowCells(cell(4, 3)));
// console.dir(colCells(cell(4, 3)));
// console.dir(blockCells(cell(4, 3)));

const b = new ModifiableBoard(emptyBoard());
b.setKnown(getPoint(1, 6), 4);
b.setKnown(getPoint(2, 3), 5);
b.setKnown(getPoint(5, 7), 6);
b.printKnowns();
b.printPossibles(4);
b.printPossibles(5);
b.printPossibles(6);
b.printPossibles(1);
b.printPossibleCounts();
