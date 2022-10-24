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
import { ReadableBoard, WritableBoard } from "./board";

import { difference, intersect } from "../utils/collections";

const MISSING = "·";
const EMPTY_SET = "∅";

/**
 * Implemented by all trackers that manipulate their own board.
 */
interface Stateful {
  addEmptyState(board: WritableBoard): void;
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
  readonly groups = new Map<Grouping, Group>();

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
    this.groups
      .set(Grouping.ROW, row)
      .set(Grouping.COLUMN, column)
      .set(Grouping.BLOCK, block);
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

  addEmptyState(board: WritableBoard): void {
    board.addCell(this);
  }

  sees(cell: Cell): boolean {
    return this.neighbors.has(cell);
  }

  toString() {
    return `Cell ${this.point.k}`;
  }

  static stringFromPoints(cells?: Iterable<Cell>, sort = true): string {
    if (!cells) {
      return EMPTY_SET;
    }

    const points = Array.from(cells).map((cell) => cell.point.k);
    if (!points.length) {
      return EMPTY_SET;
    }

    return (
      "( " +
      (sort ? points.sort((a, b) => a.localeCompare(b)) : points).join(" ") +
      " )"
    );
  }

  static keyFromPoints(cells?: Iterable<Cell>): string {
    if (!cells) {
      return EMPTY_SET;
    }

    return (
      Array.from(cells)
        .map((cell) => cell.point.k)
        .sort((a, b) => a.localeCompare(b))
        .join(",") || EMPTY_SET
    );
  }

  static stringFromGroupCoords(g: Grouping, cells: Iterable<Cell>): string {
    const coords = new Set<Coord>(
      Array.from(cells || []).map((c) => c.point.i[g])
    );
    return ALL_COORDS.map((c) =>
      coords.has(c) ? (c + 1).toString() : MISSING
    ).join("");
  }

  static uniqueRows(cells: Iterable<Cell>): Set<Coord> {
    return new Set(
      Array.from(cells)
        .map((c) => c.point.r)
        .sort((a, b) => a - b)
    );
  }

  static uniqueColumns(cells: Iterable<Cell>): Set<Coord> {
    return new Set(
      Array.from(cells)
        .map((c) => c.point.c)
        .sort((a, b) => a - b)
    );
  }

  static sortedByRowColumn(cells: Iterable<Cell>): Cell[] {
    return Array.from(cells).sort((a, b) => a.point.k.localeCompare(b.point.k));
  }

  static sortedByColumnRow(cells: Iterable<Cell>): Cell[] {
    return Array.from(cells).sort((a, b) =>
      a.point.c === b.point.c ? a.point.r - b.point.r : a.point.c - b.point.c
    );
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

  addEmptyState(board: WritableBoard): void {
    board.addContainer(this);
  }

  onSetKnown(board: WritableBoard, cell: Cell, known: Known): void {
    // override to perform actions
  }

  onOneCellLeft(board: WritableBoard, known: Known, cell: Cell): void {
    // override if necessary
  }

  onNoCellsLeft(board: WritableBoard, known: Known): void {
    // override if necessary
  }

  toString(): string {
    return `${this.name} ${Cell.stringFromPoints(this.cells)}`;
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

  onSetKnown(board: WritableBoard, cell: Cell, known: Known): void {
    const candidateCells = board.clearCandidateCells(this, known);
    for (const candidate of candidateCells) {
      if (candidate !== cell) {
        // Naked/Hidden Singles
        board.addErasedPencil(candidate, known);
      }
    }
  }

  onOneCellLeft(board: WritableBoard, known: Known, cell: Cell): void {
    // Hidden Singles
    board.addSolvedKnown(cell, known);
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
 * all of its containers are removed from the board.
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

  addEmptyState(board: WritableBoard): void {
    this.intersection.addEmptyState(board);
    this.blockDisjoint.addEmptyState(board);
    this.groupDisjoint.addEmptyState(board);
  }

  removeCandidateFromOtherDisjoint(
    board: WritableBoard,
    known: Known,
    disjoint: Disjoint
  ): void {
    const candidates = board.getCandidateCells(
      disjoint === this.blockDisjoint ? this.groupDisjoint : this.blockDisjoint,
      known
    );

    if (candidates.size) {
      for (const cell of candidates) {
        board.addErasedPencil(cell, known);
      }
    } else {
      // both disjoints are empty; stop tracking the intersection entirely
      this.clearCandidateCells(board, known);
    }
  }

  clearCandidateCells(board: WritableBoard, known: Known): void {
    board.clearCandidateCells(this.intersection, known);
    board.clearCandidateCells(this.blockDisjoint, known);
    board.clearCandidateCells(this.groupDisjoint, known);
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

  onSetKnown(board: WritableBoard, cell: Cell, known: Known): void {
    this.parent.clearCandidateCells(board, known);
  }

  onNoCellsLeft(board: WritableBoard, known: Known): void {
    this.parent.clearCandidateCells(board, known);
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

  onSetKnown(board: WritableBoard, cell: Cell, known: Known): void {
    this.parent.clearCandidateCells(board, known);
  }

  onNoCellsLeft(board: WritableBoard, known: Known): void {
    // TODO Remove this since it would be solved by Intersection Removal?
    this.parent.removeCandidateFromOtherDisjoint(board, known, this);
  }
}

// ---------- BOARD ------------------------------------------------------------------------------------------

/**
 * Manages the various structures that make up the puzzle grid.
 */
class Grid {
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

  setupEmptyState(board: WritableBoard): void {
    for (const [_, cell] of this.cells) {
      cell.addEmptyState(board);
    }
    [this.rows, this.columns, this.blocks].forEach((groups) =>
      groups.forEach((group) => group.addEmptyState(board))
    );
    for (const intersection of this.intersections) {
      intersection.addEmptyState(board);
    }
  }

  getCell(pointOrCell: Point | Cell): Cell {
    return pointOrCell instanceof Cell
      ? pointOrCell
      : this.cells.get(pointOrCell)!;
  }

  isCandidate(
    board: ReadableBoard,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return board.isCandidate(this.getCell(pointOrCell), known);
  }

  getCandidates(board: ReadableBoard, pointOrCell: Point | Cell): Set<Known> {
    return board.getCandidates(this.getCell(pointOrCell));
  }

  removeCandidate(
    board: WritableBoard,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return board.removeCandidate(this.getCell(pointOrCell), known);
  }

  getValue(board: ReadableBoard, pointOrCell: Point | Cell): Value {
    return board.getValue(this.getCell(pointOrCell));
  }

  setKnown(
    board: WritableBoard,
    pointOrCell: Point | Cell,
    known: Known
  ): boolean {
    return board.setKnown(this.getCell(pointOrCell), known);
  }

  toString(board: ReadableBoard): string {
    return ALL_COORDS.map((r) =>
      ALL_COORDS.map((c) => {
        const value = board.getValue(this.cells.get(getPoint(r, c))!);
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    ).join(" ");
  }

  validate(board: ReadableBoard): boolean {
    let valid = true;

    for (const [_, cell] of this.cells) {
      const value = board.getValue(cell);
      if (value === UNKNOWN) {
        continue;
      }

      if (board.getCandidates(cell).size) {
        console.error(
          "INVALID",
          cell.toString(),
          "=",
          value,
          "with knowns",
          board.getCandidates(cell)
        );
        valid = false;
      }

      [
        this.rows.get(cell.point.r)!,
        this.columns.get(cell.point.c)!,
        this.blocks.get(cell.point.b)!,
      ].forEach((group) => {
        const candidateCells = board.getCandidateCells(group, value);
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

export const GRID = new Grid();
