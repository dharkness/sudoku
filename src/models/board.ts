/*
 * Functions to modify a board.
 */

export type Coord = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Point = { row: Coord; col: Coord };

export const UNKNOWN = null;
export type Unknown = null;
export type Known = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type Value = Known | Unknown;
type Possible = Set<Known>;

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
  value: Value;
  possible: Possible;
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

  getValue(point: Point): Value {
    return this.getCell(point).value;
  }

  setValue(point: Point, value: Value): boolean {
    const previous = this.getValue(point);
    if (previous === value) {
      return false;
    }

    this.unlockCell(point);
    this.board.cells[point.row][point.col] = {
      ...this.board.cells[point.row][point.col],
      value,
      possible:
        value === UNKNOWN ? this.getAllActuallyPossible(point) : new Set(),
    };

    const { row, col } = point;
    const positions = touchedCellsByRowCol[row]![col]!;
    const changes: Point[] = [];
    if (value !== UNKNOWN) {
      positions.forEach((point) => {
        if (this.removePossible(point, value)) {
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
      console.log("set", point, value);
      console.dir(changes);
    } else {
      throw new Error(`Invalid known ${previous}`);
    }

    return true;
  }

  isPossible(point: Point, known: Known) {
    return this.getCell(point).possible.has(known);
  }

  isActuallyPossible({ row, col }: Point, known: Known): boolean {
    for (const point of touchedCellsByRowCol[row]![col]!) {
      if (this.getValue(point) === known) {
        return false;
      }
    }

    return true;
  }

  getAllActuallyPossible({ row, col }: Point): Set<Known> {
    const possible = new Set(knowns);
    for (const point of touchedCellsByRowCol[row]![col]!) {
      const known = this.getValue(point);
      if (known !== UNKNOWN) {
        possible.delete(known);
      }
    }

    return possible;
  }

  addPossible(point: Point, known: Known): boolean {
    if (this.getCell(point).possible.has(known)) {
      return false;
    }

    this.unlockCell(point);
    const cell = this.getCell(point);
    cell.possible = new Set(cell.possible);
    cell.possible.add(known);

    return true;
  }

  removePossible(point: Point, known: Known): boolean {
    if (!this.getCell(point).possible.has(known)) {
      return false;
    }

    this.unlockCell(point);
    const cell = this.getCell(point);
    cell.possible = new Set(cell.possible);
    cell.possible.delete(known);

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
    coords.forEach((row) =>
      console.log(
        row + 1,
        coords
          .reduce((cells: string[], col) => {
            const known = this.getCell(getPoint(row, col)).value;
            return [...cells, known === UNKNOWN ? "." : known.toString()];
          }, [])
          .join("")
      )
    );
  }

  printPossibleCounts() {
    coords.forEach((row) =>
      console.log(
        row + 1,
        coords
          .reduce((cells: string[], col) => {
            const count = this.getCell(getPoint(row, col)).possible.size;
            return [...cells, count ? count.toString() : "."];
          }, [])
          .join("")
      )
    );
  }

  printPossibles(known: Known) {
    coords.forEach((row) =>
      console.log(
        row + 1,
        coords
          .reduce((cells: string[], col) => {
            const possible = this.isPossible(getPoint(row, col), known);
            return [...cells, possible ? known.toString() : "."];
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
      value: UNKNOWN,
      possible: new Set(knowns),
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
  return coords.reduce(
    (cells: Point[], c: Coord) =>
      include || c !== col ? [...cells, { row, col: c }] : cells,
    []
  );
}

function colCells({ row, col }: Point, include = false): Point[] {
  return coords.reduce(
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
  return coords.reduce(
    (itemRows: T[][], row: Coord) => [
      ...itemRows,
      coords.reduce(
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

function known(value: number): Known {
  if (value < 1 || 9 < value) {
    throw new Error(`Invalid cell value (${value})`);
  }
  return value as Known;
}

const knowns: Known[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const coords: Coord[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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
b.setValue(getPoint(1, 6), 4);
b.setValue(getPoint(2, 3), 5);
b.setValue(getPoint(5, 7), 6);
b.printKnowns();
b.printPossibles(4);
b.printPossibles(5);
b.printPossibles(6);
b.printPossibles(1);
b.printPossibleCounts();
