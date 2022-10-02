import {
  ALL_COORDS,
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

import { difference, intersect } from "../utils/collections";

const MISSING = "·";

/**
 * Implemented by all trackers that manipulate their own state.
 */
interface Stateful {
  addEmptyState(state: WritableState): void;
}

// ---------- CELLS ------------------------------------------------------------------------------------------

/**
 * Defines a single cell within the board.
 *
 * When it has one remaining candidate, it adds it as the solution for itself.
 * When it is set to a known value, it notifies its containing groups and all neighbors.
 */
export class Cell implements Stateful {
  readonly point: Point;
  readonly row: Row;
  readonly column: Column;
  readonly block: Block;

  /**
   * All cells in this cell's row, column and block, excluding this cell.
   */
  readonly neighbors = new Set<Cell>();
  /**
   * For each cell except this one, all cells seen by both it and this cell,
   * i.e. the neighbors they have in common.
   */
  readonly commonNeighbors = new Map<Cell, Set<Cell>>();

  constructor(point: Point, row: Row, column: Column, block: Block) {
    this.point = point;
    this.row = row;
    this.column = column;
    this.block = block;
  }

  fillNeighbors() {
    for (const group of [this.block, this.row, this.column]) {
      for (const c of group.cells) {
        if (c !== this) {
          this.neighbors.add(c);
        }
      }
    }
  }

  fillCommonNeighbors(cells: Iterable<Cell>) {
    for (const c of cells) {
      if (c === this) {
        this.commonNeighbors.set(c, new Set());
      } else {
        this.commonNeighbors.set(
          c,
          c.commonNeighbors.get(this) || intersect(this.neighbors, c.neighbors)
        );
      }
    }
  }

  addEmptyState(state: WritableState): void {
    state.addCell(this);
  }

  toString() {
    return `Cell ${this.point.k}`;
  }

  static stringFromPoints(cells?: Set<Cell>, sort = true): string {
    if (!cells?.size) {
      return "∅";
    }

    const points = [...cells].map((cell) => cell.point.k);

    return (
      "( " +
      (sort ? points.sort((a, b) => a.localeCompare(b)) : points).join(" ") +
      " )"
    );
  }

  static stringFromGroupCoords(g: Grouping, cells: Set<Cell>): string {
    const coords = new Set<Coord>(
      Array.from(cells.values()).map((c) => c.point.i[g])
    );
    return ALL_COORDS.map((c) =>
      coords.has(c) ? (c + 1).toString() : MISSING
    ).join("");
  }
}

/**
 * Generic container of cells within the board.
 */
export abstract class Container implements Stateful {
  readonly name: string;
  readonly cells: Set<Cell>;

  protected constructor(name: string, cells?: Set<Cell>) {
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

// ---------- GROUPS ------------------------------------------------------------------------------------------

/**
 * Base class for rows, columns, and blocks.
 */
export abstract class Group extends Container {
  readonly grouping: Grouping;
  readonly coord: Coord;

  // top, right, bottom, left
  readonly borders = new Map<Cell, [boolean, boolean, boolean, boolean]>();

  protected constructor(grouping: Grouping, coord: Coord) {
    super(`${Grouping[grouping]} ${coord + 1}`);
    this.grouping = grouping;
    this.coord = coord;
  }

  onSetKnown(state: WritableState, cell: Cell, known: Known): void {
    const candidateCells = state.clearCandidateCells(this, known);
    for (const candidate of candidateCells) {
      if (candidate !== cell) {
        // Naked/Hidden Singles
        state.addErasedPencil(candidate, known);
      }
    }
  }

  onOneCellLeft(state: WritableState, known: Known, cell: Cell): void {
    // Hidden Singles
    state.addSolvedKnown(cell, known);
  }
}

/**
 * Defines a single row within the board.
 */
export class Row extends Group {
  constructor(coord: Coord) {
    super(Grouping.ROW, coord);
  }

  addCell(cell: Cell) {
    super.addCell(cell);

    const i = cell.point.i[this.grouping];
    this.borders.set(cell, [true, i === 8, true, i === 0]);
  }
}

/**
 * Defines a single column within the board.
 */
export class Column extends Group {
  constructor(coord: Coord) {
    super(Grouping.COLUMN, coord);
  }

  addCell(cell: Cell) {
    super.addCell(cell);

    const i = cell.point.i[this.grouping];
    this.borders.set(cell, [i === 0, true, i === 8, true]);
  }
}

/**
 * Defines a single block within the board.
 */
export class Block extends Group {
  constructor(coord: Coord) {
    super(Grouping.BLOCK, coord);
  }

  addCell(cell: Cell) {
    super.addCell(cell);

    const i = cell.point.i[this.grouping];
    this.borders.set(cell, [i < 3, i % 3 === 2, i > 5, i % 3 === 0]);
  }
}

// ---------- INTERSECTIONS ------------------------------------------------------------------------------------------

/**
 * Models the intersection between a block and a row or column
 * and the subsets of points not in the block, called disjoints.
 *
 * When either disjoint loses the last cell for a candidate,
 * that known is removed as a candidate from the other disjoint's cells
 * since it must appear in the intersection.
 *
 * - When the candidate is removed from the column/row disjoint,
 *   the candidate cells in the block are called a Pointing Pair/Triple.
 * - When the candidate is removed from the block disjoint, it is called
 *   a Box Line Reduction.
 *
 * When this happens, or a known is set anywhere in the union,
 * all of its containers are removed from the state.
 *
 * It does not cause any knowns to be solved by itself.
 */
export class Intersection {
  readonly block: Block;
  readonly group: Group;

  readonly intersection: Container;
  readonly blockDisjoint: Container;
  readonly groupDisjoint: Container;

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

  removeCandidateFromOtherDisjoint(
    state: WritableState,
    known: Known,
    disjoint: Disjoint
  ): void {
    const candidates = state.getCandidateCells(
      disjoint === this.blockDisjoint ? this.groupDisjoint : this.blockDisjoint,
      known
    );

    if (candidates.size) {
      for (const cell of candidates) {
        state.addErasedPencil(cell, known);
      }
    } else {
      // both disjoints are empty; stop tracking the intersection entirely
      this.clearCandidateCells(state, known);
    }
  }

  clearCandidateCells(state: WritableState, known: Known): void {
    state.clearCandidateCells(this.intersection, known);
    state.clearCandidateCells(this.blockDisjoint, known);
    state.clearCandidateCells(this.groupDisjoint, known);
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
    this.parent.clearCandidateCells(state, known);
  }

  onNoCellsLeft(state: WritableState, known: Known): void {
    this.parent.clearCandidateCells(state, known);
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
    this.parent.clearCandidateCells(state, known);
  }

  onNoCellsLeft(state: WritableState, known: Known): void {
    this.parent.removeCandidateFromOtherDisjoint(state, known, this);
  }
}

// ---------- BOARD ------------------------------------------------------------------------------------------

/**
 * Manages the various structures that make up the board.
 */
class Board {
  readonly cells = new Map<Point, Cell>();

  readonly rows = new Map<Coord, Row>();
  readonly columns = new Map<Coord, Column>();
  readonly blocks = new Map<Coord, Block>();
  readonly groups = new Map<Grouping, Map<Coord, Group>>([
    [Grouping.ROW, this.rows],
    [Grouping.COLUMN, this.columns],
    [Grouping.BLOCK, this.blocks],
  ]);

  readonly intersections = new Set<Intersection>();

  private readonly statefuls = new Set<Stateful>();

  constructor() {
    this.createGroups();
    this.createCells();
    this.createIntersections();
  }

  private createGroups() {
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

  private createCells() {
    const cells = new Set<Cell>();

    for (const p of ALL_POINTS) {
      const cell = new Cell(
        p,
        this.rows.get(p.r)!,
        this.columns.get(p.c)!,
        this.blocks.get(p.b)!
      );
      cells.add(cell);
      this.cells.set(p, cell);

      this.rows.get(p.r)!.addCell(cell);
      this.columns.get(p.c)!.addCell(cell);
      this.blocks.get(p.b)!.addCell(cell);

      this.statefuls.add(cell);
    }

    for (const c of cells) {
      c.fillNeighbors();
    }

    for (const c of cells) {
      c.fillCommonNeighbors(cells);
    }
  }

  private createIntersections() {
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

  isCandidate(
    state: ReadableState,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return state.isCandidate(this.getCell(pointOrCell), known);
  }

  getCandidates(state: ReadableState, pointOrCell: Point | Cell): Set<Known> {
    return state.getCandidates(this.getCell(pointOrCell));
  }

  removeCandidate(
    state: WritableState,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return state.removeCandidate(this.getCell(pointOrCell), known);
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

    for (const [_, cell] of this.cells) {
      const value = state.getValue(cell);
      if (value === UNKNOWN) {
        continue;
      }

      if (state.getCandidates(cell).size) {
        console.error(
          "INVALID",
          cell.toString(),
          "=",
          value,
          "with knowns",
          state.getCandidates(cell)
        );
        valid = false;
      }

      [
        this.rows.get(cell.point.r)!,
        this.columns.get(cell.point.c)!,
        this.blocks.get(cell.point.b)!,
      ].forEach((group) => {
        const candidateCells = state.getCandidateCells(group, value);
        if (
          candidateCells.size > 1 ||
          !(candidateCells.size === 1 || !candidateCells.has(cell))
        ) {
          console.error(
            "INVALID",
            cell.toString(),
            "=",
            value,
            group.toString(),
            "has cells",
            Cell.stringFromPoints(candidateCells)
          );
          valid = false;
        }
      });
    }

    return valid;
  }
}

export const BOARD = new Board();
