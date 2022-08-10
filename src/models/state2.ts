import { BOARD, Cell, Container } from "./structure2";
import {
  ALL_KNOWNS,
  Known,
  stringFromKnownSet,
  UNKNOWN,
  Value,
} from "./basics";

const LOG = true;

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
      throw new CannotChangeCellError(cell, current, known);
    }

    const possibles = this.getPossibleKnowns(cell);
    if (!possibles.has(known)) {
      throw new CellValueNotPossibleError(cell, known, possibles);
    }

    const remaining = new Set(possibles);
    remaining.delete(known);
    LOG &&
      console.info(
        "STATE",
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
    const neighbors = new Set<Cell>();
    const containers = [...this.possibleContainers.get(cell)!.get(known)!];
    LOG && console.info("STATE", cell.toString(), "containers", containers);
    for (const container of containers) {
      const add = container.onSetKnown(this, cell, known);
      for (const c of add) {
        neighbors.add(c);
      }
    }
    neighbors.delete(cell);

    // for every collected cell
    //   remove cell as possible, triggering last-cell and no-cells
    LOG &&
      console.info(
        "STATE",
        cell.toString(),
        "neighbors",
        Cell.stringFromSet(neighbors)
      );
    for (const n of neighbors) {
      this.removePossibleKnown(n, known);
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
          "STATE",
          cell.toString(),
          "x",
          known,
          "not in",
          stringFromKnownSet(possibles)
        );
      return false;
    }

    // remove possible known from cell
    const remaining = new Set(possibles);
    remaining.delete(known);
    this.possibleKnowns.set(cell, remaining);

    LOG &&
      console.info(
        "STATE",
        cell.toString(),
        "x",
        known,
        "==>",
        stringFromKnownSet(remaining)
      );

    // remove possible cell from its containers
    const containers = [...this.possibleContainers.get(cell)!.get(known)!];
    for (const container of containers) {
      const possibles = this.possibleCells.get(container)!.get(known)!;
      if (!possibles.has(cell)) {
        LOG &&
          console.warn(
            "STATE",
            container.toString(),
            "x",
            known,
            "not in",
            Cell.stringFromSet(possibles)
          );
        continue;
      }

      // remove cell from container
      possibles.delete(cell);
    }

    if (remaining.size === 1) {

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
        "STATE",
        container.toString(),
        "x",
        known,
        "from",
        Cell.stringFromSet(cells)
      );

    // remove all cells from the container
    knowns.set(known, new Set());

    // remove the container from each cell
    for (const cell of cells) {
      this.possibleContainers.get(cell)!.get(known)!.delete(container);
    }

    return cells;
  }

  // removePossibleCell(cell: Cell, known: Known): void {
  //   // for each container with that cell still possible
  //   //   remove the cell
  //   //   trigger last-cell and no-cells
  //   const containers = this.possibleContainers.get(cell)!.get(known)!;
  //   const possibles = this.getPossibleCells(cell)!.get(known)!;
  //   if (!possibles.has(known)) {
  //     LOG &&
  //       console.warn("STATE", cell.toString(), "x", known, "not in", possibles);
  //     return;
  //   }
  //
  //   const remaining = new Set(possibles);
  //   remaining.delete(known);
  //   this.possibleKnowns.set(cell, remaining);
  // }
}

/**
 * Thrown when attempting to set a cell to a value that is not possible.
 */
class CellValueNotPossibleError extends Error {
  constructor(cell: Cell, to: Known, possibles: Set<Known>) {
    super(
      `Cannot set ${cell.toString()} to ${to}, not in ${stringFromKnownSet(
        possibles
      )}`
    );
  }
}

/**
 * Thrown when attempting to change a cell's value.
 */
class CannotChangeCellError extends Error {
  constructor(cell: Cell, from: Known, to: Known) {
    super(`Cannot change ${cell.toString()} from ${from} to ${to}`);
  }
}

export function createEmptySimpleState(): WritableState {
  const state = new SimpleState();
  BOARD.setupEmptyState(state);
  console.info(state);
  return state;
}
