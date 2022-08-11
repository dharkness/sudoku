import { BOARD, Cell, Container } from "./structure";
import {
  ALL_KNOWNS,
  Known,
  stringFromKnownSet,
  UNKNOWN,
  Value,
} from "./basics";
import { Solutions } from "./solutions";
import { singleSetValue } from "../utils/collections";

const LOG = false;

export interface ReadableState {
  solvedCount(): number;
  isSolved(cell?: Cell): boolean;
  getValue(cell: Cell): Value;

  getPossibleKnownsCount(cell: Cell): number;
  isPossibleKnown(cell: Cell, known: Known): boolean;
  getPossibleKnowns(cell: Cell): Set<Known>;

  getPossibleCells(container: Container, known: Known): Set<Cell>;
}

export interface WritableState extends ReadableState {
  addCell(cell: Cell): void;
  addContainer(container: Container): void;

  setKnown(cell: Cell, known: Known): boolean;
  removePossibleKnown(cell: Cell, known: Known): boolean;
  clearPossibleCells(container: Container, known: Known): Set<Cell>;

  // FACTOR Move Solved to Context { Board, State, Solved }
  getSolved(): Solutions;
  addSolvedKnown(cell: Cell, known: Known): void;
  removeSolvedKnown(cell: Cell): void;
  addErasedPencil(cell: Cell, known: Known): void;
  removeErasedPencil(cell: Cell, known: Known): void;
  clearSolved(): void;
}

export class SimpleState implements WritableState {
  private readonly values = new Map<Cell, Value>();
  private readonly possibleKnowns = new Map<Cell, Set<Known>>();

  private readonly containers = new Map<Cell, Set<Container>>();
  private readonly possibleContainers = new Map<
    Cell,
    Map<Known, Set<Container>>
  >();

  private readonly possibleCells = new Map<Container, Map<Known, Set<Cell>>>();

  private solutions = new Solutions();

  addCell(cell: Cell): void {
    this.values.set(cell, UNKNOWN);
    this.possibleKnowns.set(cell, new Set(ALL_KNOWNS));
    this.containers.set(cell, new Set());
    this.possibleContainers.set(
      cell,
      new Map(ALL_KNOWNS.map((k) => [k, new Set()]))
    );
  }

  addContainer(container: Container): void {
    for (const c of container.cells) {
      this.containers.get(c)!.add(container);
      for (const k of ALL_KNOWNS) {
        this.possibleContainers.get(c)!.get(k)!.add(container);
      }
    }
    this.possibleCells.set(
      container,
      new Map(ALL_KNOWNS.map((k) => [k, new Set(container.cells)]))
    );
  }

  // ========== CELL VALUES ========================================

  solvedCount(): number {
    let count = 0;
    for (const [_, v] of this.values) {
      if (v !== UNKNOWN) {
        count++;
      }
    }
    return count;
  }

  isSolved(cell?: Cell): boolean {
    if (cell) {
      return this.values.get(cell) !== UNKNOWN;
    } else {
      for (const [_, v] of this.values) {
        if (v === UNKNOWN) {
          return false;
        }
      }
      return true;
    }
  }

  getValue(cell: Cell): Value {
    return this.values.get(cell)!;
  }

  setKnown(cell: Cell, known: Known): boolean {
    const current = this.getValue(cell);
    if (current === known) {
      return false;
    }
    if (current !== UNKNOWN) {
      throw new ChangeCellValueError(cell, current, known);
    }

    const possibles = this.getPossibleKnowns(cell);
    if (!possibles.has(known)) {
      throw new CellValueNotPossibleError(cell, known, possibles);
    }

    const remaining = new Set(possibles);
    remaining.delete(known);
    LOG &&
      console.info(
        "STATE set",
        cell.toString(),
        "=>",
        known,
        "==>",
        stringFromKnownSet(remaining)
      );
    this.values.set(cell, known);
    this.possibleKnowns.set(cell, remaining);

    // for every container of this cell
    //   remove known as possible from cell
    //   collect possible cells into set to remove as possible, i.e. neighbors
    //     Groups return cells; Intersections return none
    const containers = [...this.possibleContainers.get(cell)!.get(known)!];
    for (const container of containers) {
      container.onSetKnown(this, cell, known);
    }

    // for every remaining known in cell
    //   remove possible known
    for (const k of [...remaining]) {
      this.removePossibleKnown(cell, k);
    }

    return true;
  }

  // ========== POSSIBLE CELL KNOWNS ========================================

  getPossibleKnownsCount(cell: Cell): number {
    return this.possibleKnowns.get(cell)!.size;
  }

  isPossibleKnown(cell: Cell, known: Known): boolean {
    return this.possibleKnowns.get(cell)!.has(known);
  }

  getPossibleKnowns(cell: Cell): Set<Known> {
    return this.possibleKnowns.get(cell)!;
  }

  removePossibleKnown(cell: Cell, known: Known): boolean {
    const possibles = this.getPossibleKnowns(cell);
    if (!possibles.has(known)) {
      LOG &&
        console.warn(
          "STATE erase",
          known,
          "from",
          cell.toString(),
          "not in",
          stringFromKnownSet(possibles)
        );
      return false;
    }
    if (possibles.size === 1 && !this.isSolved(cell)) {
      throw new RemoveLastCellPossibleValueError(cell, known);
    }

    // remove possible known from cell
    const remaining = new Set(possibles);
    remaining.delete(known);
    this.possibleKnowns.set(cell, remaining);

    LOG &&
      console.info(
        "STATE erase",
        known,
        "from",
        cell.toString(),
        "==>",
        stringFromKnownSet(remaining)
      );

    // solve cell if only one possible known remaining
    if (remaining.size === 1) {
      this.addSolvedKnown(cell, singleSetValue(remaining));
    }

    // remove possible cell from its containers
    const containers = [...this.possibleContainers.get(cell)!.get(known)!];
    for (const container of containers) {
      const possibles = this.possibleCells.get(container)!.get(known)!;
      if (!possibles.has(cell)) {
        LOG &&
          console.warn(
            "STATE remove",
            container.name,
            "x",
            known,
            cell.toString(),
            "not in",
            Cell.stringFromPoints(possibles)
          );
        continue;
      }

      // remove cell from container
      const remaining = new Set(possibles);
      remaining.delete(cell);
      this.possibleCells.get(container)!.set(known, remaining);

      LOG &&
        console.info(
          "STATE erase",
          known,
          "from",
          cell.toString(),
          "in",
          container.name,
          "==>",
          Cell.stringFromPoints(remaining)
        );

      // notify container when zero or one possible cell remains
      switch (remaining.size) {
        case 1:
          container.onOneCellLeft(this, known, singleSetValue(remaining));
          break;

        case 0:
          container.onNoCellsLeft(this, known);
          break;
      }
    }

    return true;
  }

  // ========== POSSIBLE CONTAINER CELLS ========================================

  getPossibleCells(container: Container, known: Known): Set<Cell> {
    return this.possibleCells.get(container)!.get(known)!;
  }

  clearPossibleCells(container: Container, known: Known): Set<Cell> {
    const knowns = this.possibleCells.get(container)!;
    const cells = knowns.get(known)!;

    LOG &&
      console.info(
        "STATE clear",
        container.name,
        "x",
        known,
        "from",
        Cell.stringFromPoints(cells)
      );

    // remove all cells from the container
    knowns.set(known, new Set());

    // remove the container from each cell
    for (const cell of cells) {
      this.possibleContainers.get(cell)!.get(known)!.delete(container);
    }

    return cells;
  }

  getSolved(): Solutions {
    return this.solutions;
  }

  addSolvedKnown(cell: Cell, known: Known): void {
    if (this.isSolved(cell)) {
      return;
    }

    this.solutions.addSolvedKnown(cell, known);
  }

  removeSolvedKnown(cell: Cell): void {
    this.solutions.removeSolvedKnown(cell);
  }

  addErasedPencil(cell: Cell, known: Known): void {
    if (!this.isPossibleKnown(cell, known)) {
      return;
    }

    this.solutions.addErasedPencil(cell, known);
  }

  removeErasedPencil(cell: Cell, known: Known): void {
    this.solutions.removeErasedPencil(cell, known);
  }

  clearSolved(): void {
    this.solutions = new Solutions();
  }
}

/**
 * Thrown when attempting to set a cell to a value that is not possible.
 */
class CellValueNotPossibleError extends Error {
  constructor(cell: Cell, to: Known, possibles: Set<Known>) {
    super(
      `Cannot set ${cell.toString()} to ${to} not in ${stringFromKnownSet(
        possibles
      )}`
    );
  }
}

/**
 * Thrown when attempting to remove a cell's last possible value.
 */
class RemoveLastCellPossibleValueError extends Error {
  constructor(cell: Cell, possible: Known) {
    super(
      `Cannot remove last possible value ${possible} from ${cell.toString()}`
    );
  }
}

/**
 * Thrown when attempting to change a cell's value.
 */
class ChangeCellValueError extends Error {
  constructor(cell: Cell, from: Known, to: Known) {
    super(`Cannot change ${cell.toString()} from ${from} to ${to}`);
  }
}

/**
 * Returns a new empty, writable state.
 */
export function createEmptySimpleState(): WritableState {
  const state = new SimpleState();
  BOARD.setupEmptyState(state);
  console.info(state);
  return state;
}
