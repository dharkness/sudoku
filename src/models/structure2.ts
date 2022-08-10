import {
  ALL_COORDS,
  ALL_KNOWNS,
  ALL_POINTS,
  Coord,
  getPoint,
  Grouping,
  Known,
  Point,
  PointSet,
  UNKNOWN,
} from "./basics";
import { ReadableState, WritableState } from "./state2";

/**
 * Implemented by all trackers that manipulate their own state.
 */
interface Stateful {
  addEmptyState(state: WritableState): void;
}

export class Cell implements Stateful {
  readonly point: Point;

  constructor(point: Point) {
    this.point = point;
  }

  addEmptyState(state: WritableState): void {
    state.addCell(this);
  }

  toString() {
    return `Cell ${this.point.k}`;
  }

  static stringFromSet(cells: Set<Cell>): string {
    return (
      "( " + [...cells.values()].map((cell) => cell.point.k).join(" ") + " )"
    );
  }
}

export class Container implements Stateful {
  readonly name: string;
  readonly cells = new Set<Cell>();

  constructor(name: string) {
    this.name = name;
  }

  addCell(cell: Cell) {
    this.cells.add(cell);
  }

  addEmptyState(state: WritableState): void {
    state.addContainer(this);
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): Set<Cell> {
    // override to perform actions
    // TODO Intersection should stop all tracking
    return new Set();
  }

  toString(): string {
    return `${this.name} ${Cell.stringFromSet(this.cells)}`;
  }
}

export class Group extends Container {
  readonly grouping: Grouping;
  readonly coord: Coord;

  constructor(grouping: Grouping, coord: Coord) {
    super(`${Grouping[grouping]} ${coord + 1}`);
    this.grouping = grouping;
    this.coord = coord;
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): Set<Cell> {
    return state.clearPossibleCells(this, known);
  }
}

class Row extends Group {
  constructor(coord: Coord) {
    super(Grouping.ROW, coord);
  }
}

class Column extends Group {
  constructor(coord: Coord) {
    super(Grouping.COLUMN, coord);
  }
}

class Block extends Group {
  constructor(coord: Coord) {
    super(Grouping.BLOCK, coord);
  }
}

class Board {
  readonly cells = new Map<Point, Cell>();
  readonly rows = new Map<Coord, Row>();
  readonly columns = new Map<Coord, Column>();
  readonly blocks = new Map<Coord, Block>();

  private readonly statefuls = new Set<Stateful>();

  constructor() {
    for (const c of ALL_COORDS) {
      const row = new Row(c);
      this.rows.set(c, row);
      this.statefuls.add(row);

      const column = new Column(c);
      this.columns.set(c, column);
      this.statefuls.add(column);

      const block = new Block(c);
      this.blocks.set(c, block);
      this.statefuls.add(block);
    }

    for (const p of ALL_POINTS) {
      const cell = new Cell(p);
      this.cells.set(p, cell);

      this.rows.get(p.r)!.addCell(cell);
      this.columns.get(p.c)!.addCell(cell);
      this.blocks.get(p.b)!.addCell(cell);

      this.statefuls.add(cell);
    }
  }

  setupEmptyState(state: WritableState): void {
    for (const [_, cell] of this.cells) {
      state.addCell(cell);
    }
    [this.rows, this.columns, this.blocks].forEach((groups) =>
      groups.forEach((group) => state.addContainer(group))
    );
    // for (const s of this.statefuls) {
    //   s.addEmptyState(state);
    // }
  }

  getCell(point: Point): Cell {
    return this.cells.get(point)!;
  }

  setKnown(state: WritableState, point: Point, known: Known): boolean {
    return state.setKnown(this.cells.get(point)!, known);
  }

  toString(state: ReadableState): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = state.getValue(this.getCell(getPoint(r, c)));
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    ).join(" ");
  }

  validate(state: ReadableState): boolean {
    let valid = true;

    for (const [point, cell] of this.cells) {
      const value = state.getValue(cell);
      if (value === UNKNOWN) {
        continue;
      }

      if (state.getPossibleKnowns(cell).size) {
        console.log(
          "INVALID",
          cell.toString(),
          "=",
          value,
          "with knowns",
          state.getPossibleKnowns(cell)
        );
        valid = false;
      }

      [
        this.rows.get(cell.point.r)!,
        this.columns.get(cell.point.c)!,
        this.blocks.get(cell.point.b)!,
      ].forEach((group) => {
        const possibles = state.getPossibleCells(group, value);
        if (
          possibles.size > 1 ||
          !(possibles.size === 1 || !possibles.has(cell))
        ) {
          console.log(
            "INVALID",
            cell.toString(),
            "=",
            value,
            group.toString(),
            "has cells",
            Cell.stringFromSet(possibles)
          );
          valid = false;
        }
      });
    }

    return valid;
  }
}

export const BOARD = new Board();
