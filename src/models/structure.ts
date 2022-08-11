import {
  ALL_COORDS,
  ALL_KNOWNS,
  ALL_POINTS,
  coord,
  Coord,
  getPoint,
  Grouping,
  Known,
  Point,
  UNKNOWN,
  Value,
} from "./basics";
import { ReadableState, WritableState } from "./state";
import { difference, intersect, singleSetValue } from "../utils/collections";

/**
 * Implemented by all trackers that manipulate their own state.
 */
interface Stateful {
  addEmptyState(state: WritableState): void;
}

/**
 * Defines a single cell within the board.
 *
 * When it has one remaining possible known value (pencil mark), it adds it as the solution for itself.
 * When it is set to a known value, it notifies its containing groups and all neighbors.
 */
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

  static stringFromPoints(cells: Set<Cell>): string {
    return (
      "( " + [...cells.values()].map((cell) => cell.point.k).join(" ") + " )"
    );
  }

  static stringFromGroupCoords(g: Grouping, cells: Set<Cell>): string {
    const coords = new Set<Coord>(
      Array.from(cells.values()).map((c) => c.point.i[g])
    );
    return ALL_COORDS.map((c) =>
      coords.has(c) ? (c + 1).toString() : "."
    ).join("");
  }
}

/**
 * Generic container of cells within the board.
 */
export abstract class Container implements Stateful {
  readonly name: string;
  readonly cells: Set<Cell>;

  constructor(name: string, cells?: Set<Cell>) {
    this.name = name;
    this.cells = cells ?? new Set<Cell>();
  }

  addCell(cell: Cell) {
    this.cells.add(cell);
  }

  addEmptyState(state: WritableState): void {
    state.addContainer(this);
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): void {
    // override to perform actions
  }

  toString(): string {
    return `${this.name} ${Cell.stringFromPoints(this.cells)}`;
  }

  onOneCellLeft(state: WritableState, known: Known, cell: Cell): void {
    // override if necessary
  }

  onNoCellsLeft(state: WritableState, known: Known): void {
    // override if necessary
  }
}

/**
 * Base class for rows, columns, and blocks.
 */
export abstract class Group extends Container {
  readonly grouping: Grouping;
  readonly coord: Coord;

  constructor(grouping: Grouping, coord: Coord) {
    super(`${Grouping[grouping]} ${coord + 1}`);
    this.grouping = grouping;
    this.coord = coord;
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): void {
    const possibles = state.clearPossibleCells(this, known);
    for (const neighbor of possibles) {
      if (neighbor !== cell) {
        state.addErasedPencil(neighbor, known);
      }
    }
  }

  onOneCellLeft(state: WritableState, known: Known, cell: Cell): void {
    state.addSolvedKnown(cell, known);
  }
}

/**
 * Defines a single row within the board.
 */
class Row extends Group {
  constructor(coord: Coord) {
    super(Grouping.ROW, coord);
  }
}

/**
 * Defines a single column within the board.
 */
class Column extends Group {
  constructor(coord: Coord) {
    super(Grouping.COLUMN, coord);
  }
}

/**
 * Defines a single block within the board.
 */
class Block extends Group {
  constructor(coord: Coord) {
    super(Grouping.BLOCK, coord);
  }
}

/**
 * Tracks the cells in common between a block and a row or column.
 */
class Intersect extends Container {
  private readonly parent: Intersection;

  constructor(parent: Intersection, name: string, cells: Set<Cell>) {
    super(name, cells);
    this.parent = parent;
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): void {
    this.parent.clearPossibleCells(state, known);
  }

  onNoCellsLeft(state: WritableState, known: Known): void {
    this.parent.clearPossibleCells(state, known);
  }
}

/**
 * Tracks the cells not in common between a block and a row or column.
 */
class Disjoint extends Container {
  private readonly parent: Intersection;

  constructor(parent: Intersection, name: string, cells: Set<Cell>) {
    super(name, cells);
    this.parent = parent;
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): void {
    this.parent.clearPossibleCells(state, known);
  }

  onNoCellsLeft(state: WritableState, known: Known): void {
    this.parent.removePossibleKnownForOtherDisjoint(state, known, this);
    this.parent.clearPossibleCells(state, known);
  }
}

/**
 * Models the intersection between a block and a row or column
 * and the subsets of points not in the block, called disjoints.
 *
 * When either disjoint loses the last possible cell for a known,
 * that known is removed as a possible from the other disjoint's cells
 * since it must appear in the intersection.
 *
 * When this happens, or a known is set anywhere in the union,
 * all of its containers is removed from the state.
 *
 * It does not cause any knowns to be solved by itself.
 */
class Intersection {
  private readonly block: Block;
  private readonly group: Group;

  private readonly intersection: Container;
  private readonly blockDisjoint: Container;
  private readonly groupDisjoint: Container;

  constructor(block: Block, group: Group) {
    this.block = block;
    this.group = group;

    const intersection = intersect(block.cells, group.cells);
    this.intersection = new Intersect(
      this,
      `Intersection ( ${this.block.name}, ${this.group.name} )`,
      intersection
    );
    this.blockDisjoint = new Disjoint(
      this,
      `Block Disjoint ( ${this.block.name}, ${this.group.name} )`,
      difference(block.cells, intersection)
    );
    this.groupDisjoint = new Disjoint(
      this,
      `Group Disjoint ( ${this.block.name}, ${this.group.name} )`,
      difference(group.cells, intersection)
    );
  }

  addEmptyState(state: WritableState): void {
    this.intersection.addEmptyState(state);
    this.blockDisjoint.addEmptyState(state);
    this.groupDisjoint.addEmptyState(state);
  }

  removePossibleKnownForOtherDisjoint(
    state: WritableState,
    known: Known,
    disjoint: Disjoint
  ): void {
    const other =
      disjoint === this.blockDisjoint ? this.groupDisjoint : this.blockDisjoint;
    for (const cell of other.cells) {
      state.removePossibleKnown(cell, known);
    }
  }

  clearPossibleCells(state: WritableState, known: Known): void {
    state.clearPossibleCells(this.intersection, known);
    state.clearPossibleCells(this.blockDisjoint, known);
    state.clearPossibleCells(this.groupDisjoint, known);
  }
}

/**
 * Manages the various structures that make up the board.
 */
class Board {
  private readonly cells = new Map<Point, Cell>();

  readonly rows = new Map<Coord, Row>();
  readonly columns = new Map<Coord, Column>();
  readonly blocks = new Map<Coord, Block>();

  private readonly intersections = new Set<Intersection>();

  private readonly statefuls = new Set<Stateful>();

  constructor() {
    this.createCells();
    this.createGroups();
    this.createIntersections();
  }

  createCells() {
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
  }

  createGroups() {
    for (const p of ALL_POINTS) {
      const cell = new Cell(p);
      this.cells.set(p, cell);

      this.rows.get(p.r)!.addCell(cell);
      this.columns.get(p.c)!.addCell(cell);
      this.blocks.get(p.b)!.addCell(cell);

      this.statefuls.add(cell);
    }
  }

  createIntersections() {
    for (const [_, block] of this.blocks) {
      this.intersections.add(
        new Intersection(
          block,
          this.rows.get(coord(3 * Math.floor(block.coord / 3), "row"))!
        )
      );
      this.intersections.add(
        new Intersection(
          block,
          this.rows.get(coord(3 * Math.floor(block.coord / 3) + 1, "row"))!
        )
      );
      this.intersections.add(
        new Intersection(
          block,
          this.rows.get(coord(3 * Math.floor(block.coord / 3) + 2, "row"))!
        )
      );

      this.intersections.add(
        new Intersection(
          block,
          this.columns.get(coord(3 * (block.coord % 3), "column"))!
        )
      );
      this.intersections.add(
        new Intersection(
          block,
          this.columns.get(coord(3 * (block.coord % 3) + 1, "column"))!
        )
      );
      this.intersections.add(
        new Intersection(
          block,
          this.columns.get(coord(3 * (block.coord % 3) + 2, "column"))!
        )
      );
    }
  }

  setupEmptyState(state: WritableState): void {
    for (const [_, cell] of this.cells) {
      cell.addEmptyState(state);
    }
    [this.rows, this.columns, this.blocks].forEach((groups) =>
      groups.forEach((group) => group.addEmptyState(state))
    );
    for (const intersection of this.intersections) {
      intersection.addEmptyState(state);
    }
  }

  getCell(pointOrCell: Point | Cell): Cell {
    return pointOrCell instanceof Cell
      ? pointOrCell
      : this.cells.get(pointOrCell)!;
  }

  isPossible(
    state: ReadableState,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return state.isPossibleKnown(this.getCell(pointOrCell), known);
  }

  getPossibles(state: ReadableState, pointOrCell: Point | Cell): Set<Known> {
    return state.getPossibleKnowns(this.getCell(pointOrCell));
  }

  removePossible(
    state: WritableState,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return state.removePossibleKnown(this.getCell(pointOrCell), known);
  }

  getValue(state: ReadableState, pointOrCell: Point | Cell): Value {
    return state.getValue(this.getCell(pointOrCell));
  }

  setKnown(
    state: WritableState,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return state.setKnown(this.getCell(pointOrCell), known);
  }

  toString(state: ReadableState): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = state.getValue(this.cells.get(getPoint(r, c))!);
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
        console.error(
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
          console.error(
            "INVALID",
            cell.toString(),
            "=",
            value,
            group.toString(),
            "has cells",
            Cell.stringFromPoints(possibles)
          );
          valid = false;
        }
      });
    }

    return valid;
  }
}

export const BOARD = new Board();
