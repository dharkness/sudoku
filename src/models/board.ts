// noinspection JSUnusedLocalSymbols

import {
  ALL_KNOWNS,
  Known,
  stringFromKnownSet,
  UNKNOWN,
  Value,
} from "./basics";
import { GRID, Cell, Container } from "./grid";
import { Moves, Strategy } from "./move";

import {
  deepCloneMap,
  deepCloneMapOfSets,
  excluding,
  singleSetValue,
} from "../utils/collections";

const LOG = false;

enum CellError {
  Unsolvable,
  Duplicate,
}

export interface ReadableBoard {
  solvedCount(): number;
  isSolved(cell?: Cell): boolean;
  getValue(cell: Cell): Value;

  getCandidateCount(cell: Cell): number;
  isCandidate(cell: Cell, known: Known): boolean;
  getCandidates(cell: Cell): Set<Known>;

  getCandidateCells(container: Container, known: Known): Set<Cell>;
  getCandidateCellsByKnown(container: Container): Map<Known, Set<Cell>>;

  collectErrors(): Map<Cell, CellError>;
}

export interface WritableBoard extends ReadableBoard {
  addCell(cell: Cell): void;
  addContainer(container: Container): void;

  setKnown(cell: Cell, known: Known, moves: Moves): boolean;
  removeCandidate(
    cell: Cell,
    known: Known,
    triggerLastCandidate: boolean,
    moves: Moves
  ): boolean;
  clearCandidateCells(container: Container, known: Known): Set<Cell>;
}

export class SimpleBoard implements WritableBoard {
  public readonly step: number;

  private readonly values: Map<Cell, Value>;
  private readonly candidates: Map<Cell, Set<Known>>;

  private readonly containers: Map<Cell, Set<Container>>;
  private readonly candidateContainers: Map<Cell, Map<Known, Set<Container>>>;

  private readonly candidateCells: Map<Container, Map<Known, Set<Cell>>>;

  constructor(clone?: SimpleBoard) {
    if (clone) {
      this.step = clone.step + 1;
      this.values = new Map(clone.values);
      this.candidates = deepCloneMapOfSets(clone.candidates);
      this.containers = deepCloneMapOfSets(clone.containers);
      this.candidateContainers = deepCloneMap(
        clone.candidateContainers,
        deepCloneMapOfSets
      );
      this.candidateCells = deepCloneMap(
        clone.candidateCells,
        deepCloneMapOfSets
      );
    } else {
      this.step = 1;
      this.values = new Map<Cell, Value>();
      this.candidates = new Map<Cell, Set<Known>>();
      this.containers = new Map<Cell, Set<Container>>();
      this.candidateContainers = new Map<Cell, Map<Known, Set<Container>>>();
      this.candidateCells = new Map<Container, Map<Known, Set<Cell>>>();
    }
  }

  addCell(cell: Cell): void {
    this.values.set(cell, UNKNOWN);
    this.candidates.set(cell, new Set(ALL_KNOWNS));
    this.containers.set(cell, new Set());
    this.candidateContainers.set(
      cell,
      new Map(ALL_KNOWNS.map((k) => [k, new Set()]))
    );
  }

  addContainer(container: Container): void {
    for (const c of container.cells) {
      this.containers.get(c)!.add(container);
      for (const k of ALL_KNOWNS) {
        this.candidateContainers.get(c)!.get(k)!.add(container);
      }
    }
    this.candidateCells.set(
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

  setKnown(cell: Cell, known: Known, moves: Moves): boolean {
    const current = this.getValue(cell);
    if (current === known) {
      return false;
    }
    if (current !== UNKNOWN) {
      throw new ChangeCellValueError(cell, current, known);
    }

    const candidates = this.getCandidates(cell);
    if (!candidates.has(known)) {
      throw new NotCandidateError(cell, known, candidates);
    }

    const remaining = excluding(candidates, known);
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
    this.candidates.set(cell, remaining);

    // for every container of this cell
    //   remove candidate from cell
    //   collect candidate cells into set to remove as candidate, i.e. neighbors
    //     Groups return cells; Intersections return none
    const containers = this.candidateContainers.get(cell)!.get(known)!;
    for (const container of containers) {
      container.onSetKnown(this, cell, known, moves);
    }

    // for every remaining known in cell
    //   remove candidates
    for (const k of remaining) {
      this.removeCandidate(cell, k, false, moves);
    }

    return true;
  }

  // ========== CANDIDATES ========================================

  getCandidateCount(cell: Cell): number {
    return this.candidates.get(cell)!.size;
  }

  isCandidate(cell: Cell, known: Known): boolean {
    return this.candidates.get(cell)!.has(known);
  }

  getCandidates(cell: Cell): Set<Known> {
    return this.candidates.get(cell)!;
  }

  removeCandidate(
    cell: Cell,
    known: Known,
    triggerLastCandidate: boolean,
    moves: Moves
  ): boolean {
    const candidates = this.getCandidates(cell);
    if (!candidates.has(known)) {
      LOG &&
        console.warn(
          "STATE erase",
          known,
          "from",
          cell.toString(),
          "not in",
          stringFromKnownSet(candidates)
        );
      return false;
    }
    // if (candidates.size === 1 && !this.isSolved(cell)) {
    //   throw new RemoveLastCandidateError(cell, known);
    // }

    // remove candidate from cell
    const remaining = new Set(candidates);
    remaining.delete(known);
    this.candidates.set(cell, remaining);

    LOG &&
      console.info(
        "STATE erase",
        known,
        "from",
        cell.toString(),
        "==>",
        stringFromKnownSet(remaining)
      );

    // solve cell if only one candidate remaining
    if (triggerLastCandidate && remaining.size === 1) {
      moves.add(Strategy.NakedSingle).set(cell, singleSetValue(remaining));
    }

    // remove candidate cell from its containers
    const containers = this.candidateContainers.get(cell)!.get(known)!;
    for (const container of containers) {
      const candidateCells = this.candidateCells.get(container)!.get(known)!;
      if (!candidateCells.has(cell)) {
        LOG &&
          console.warn(
            "STATE remove",
            container.name,
            "x",
            known,
            cell.toString(),
            "not in",
            Cell.stringFromPoints(candidateCells)
          );
        continue;
      }

      // remove cell from container
      const remaining = excluding(candidateCells, cell);
      this.candidateCells.get(container)!.set(known, remaining);

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

      // notify container when zero or one candidate cell remains
      switch (remaining.size) {
        case 1:
          container.onOneCellLeft(
            this,
            known,
            singleSetValue(remaining),
            moves
          );
          break;

        case 0:
          container.onNoCellsLeft(this, known, moves);
          break;
      }
    }

    return true;
  }

  // ========== CANDIDATE CELLS ========================================

  getCandidateCells(container: Container, known: Known): Set<Cell> {
    return this.candidateCells.get(container)!.get(known)!;
  }

  getCandidateCellsByKnown(container: Container): Map<Known, Set<Cell>> {
    return this.candidateCells.get(container)!;
  }

  clearCandidateCells(container: Container, known: Known): Set<Cell> {
    const knowns = this.candidateCells.get(container)!;
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
      this.candidateContainers.get(cell)!.get(known)!.delete(container);
    }

    return cells;
  }

  // ========== ERRORS ========================================

  collectErrors(): Map<Cell, CellError> {
    const errors = new Map<Cell, CellError>();

    for (const cell of GRID.cells.values()) {
      if (this.isSolved(cell)) {
        const known = this.getValue(cell);

        for (const neighbor of cell.neighbors) {
          if (this.getValue(neighbor) === known) {
            errors.set(cell, CellError.Duplicate);
          }
        }
      } else {
        if (!this.getCandidates(cell).size) {
          errors.set(cell, CellError.Unsolvable);
        }
      }
    }

    return errors;
  }
}

/**
 * Thrown when attempting to set a cell to a value that is not a candidate.
 */
class NotCandidateError extends Error {
  constructor(cell: Cell, to: Known, candidatess: Set<Known>) {
    super(
      `Cannot set ${cell.toString()} to ${to} not in ${stringFromKnownSet(
        candidatess
      )}`
    );
  }
}

/**
 * Thrown when attempting to remove a cell's last candidate.
 */
class RemoveLastCandidateError extends Error {
  constructor(cell: Cell, candidate: Known) {
    super(`Cannot remove last candidate ${candidate} from ${cell.toString()}`);
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
 * Returns a new empty, writable board.
 */
export function createEmptySimpleBoard(): SimpleBoard {
  const board = new SimpleBoard();
  GRID.setupEmptyState(board);
  return board;
}
