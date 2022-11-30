// noinspection JSUnusedLocalSymbols

import {
  ALL_KNOWNS,
  Known,
  stringFromKnownSet,
  UNKNOWN,
  Value,
} from "./basics";
import { GRID, Cell, Container, Group } from "./grid";
import { Moves } from "./move";
import { Strategy } from "./strategy";

import {
  deepCloneMap,
  deepCloneMapOfSets,
  deepSet,
  difference,
  excluding,
  singleValue,
} from "../utils/collections";

const LOG = false;

export interface ReadableBoard {
  clone(): ReadableBoard;

  solvedCount(): number;
  isSolved(cell?: Cell): boolean;
  getValue(cell: Cell): Value;
  getSolvedCells(): Map<Cell, Known>;

  getCandidateCount(cell: Cell): number;
  isCandidate(cell: Cell, known: Known): boolean;
  getCandidates(cell: Cell): Set<Known>;

  getCandidateCells(container: Container, known: Known): Set<Cell>;
  getCandidateCellsByKnown(container: Container): Map<Known, Set<Cell>>;

  hasErrors(): boolean;
  getErrors(): BoardErrors;
}

export interface WritableBoard extends ReadableBoard {
  clone(): WritableBoard;

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

  addCellError(cell: Cell, error: CellError): void;
  addGroupError(group: Group, known: Known, error: GroupError): void;
}

export class SimpleBoard implements WritableBoard {
  /**
   * Returns a new empty, writable board.
   */
  static createEmpty(): SimpleBoard {
    const board = new SimpleBoard();
    GRID.setupEmptyState(board);
    return board;
  }

  static createFrom(values: string): [SimpleBoard, Moves];
  static createFrom(knowns: Map<Cell, Known>): [SimpleBoard, Moves];
  static createFrom(moves: Moves): [SimpleBoard, Moves];
  static createFrom(board: ReadableBoard): [SimpleBoard, Moves];
  static createFrom(
    source?: string | Map<Cell, Known> | Moves | ReadableBoard
  ): [SimpleBoard, Moves] {
    if (source instanceof SimpleBoard) {
      return [new SimpleBoard(source), Moves.createEmpty()];
    } else if (!source) {
      return [this.createEmpty(), Moves.createEmpty()];
    } else if (typeof source === "string") {
      return this.createFrom(Moves.createFrom(source));
    } else if (source instanceof Moves) {
      const board = this.createEmpty();

      return [board, source.apply(board)];
    } else if (source instanceof Map) {
      return this.createFrom(Moves.createFrom(source));
    } else {
      return this.createFrom(Moves.createFrom(source.getSolvedCells()));
    }
  }

  public readonly step: number;

  private readonly values: Map<Cell, Value>;
  private readonly candidates: Map<Cell, Set<Known>>;

  private readonly containers: Map<Cell, Set<Container>>;
  private readonly candidateContainers: Map<Cell, Map<Known, Set<Container>>>;

  private readonly candidateCells: Map<Container, Map<Known, Set<Cell>>>;

  private readonly errors: BoardErrors;

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
      this.errors = clone.errors.clone();
    } else {
      this.step = 1;
      this.values = new Map<Cell, Value>();
      this.candidates = new Map<Cell, Set<Known>>();
      this.containers = new Map<Cell, Set<Container>>();
      this.candidateContainers = new Map<Cell, Map<Known, Set<Container>>>();
      this.candidateCells = new Map<Container, Map<Known, Set<Cell>>>();
      this.errors = new BoardErrors();
    }
  }

  clone(): SimpleBoard {
    return new SimpleBoard(this);
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

    // FACTOR Move logic to Group.onSetKnown() called below?
    const remainingContainers = this.candidateContainers.get(cell)!.get(known)!;
    for (const group of cell.groups.values()) {
      if (!remainingContainers.has(group)) {
        this.addCellError(cell, CellError.Duplicate);
        this.addGroupError(group, known, GroupError.Duplicate);

        // FACTOR Track solved knowns per container? Need to track sets to handle three or more dupe cells in a group
        for (const neighbor of group.cells) {
          if (this.values.get(neighbor) === known) {
            this.addCellError(neighbor, CellError.Duplicate);
          }
        }
      }
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

  getSolvedCells(): Map<Cell, Known> {
    return Array.from(this.values.entries()).reduce(
      (map, [cell, known]) => (known === UNKNOWN ? map : map.set(cell, known)),
      new Map<Cell, Known>()
    );
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
    if (candidates.size === 1 && !this.isSolved(cell)) {
      this.addCellError(cell, CellError.Unsolvable);
      // throw new RemoveLastCandidateError(cell, known);
    }

    // remove candidate from cell
    const remaining = excluding(candidates, known);
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
      moves.start(Strategy.NakedSingle).set(cell, singleValue(remaining));
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
          container.onOneCellLeft(this, known, singleValue(remaining), moves);
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

  hasErrors(): boolean {
    return !this.errors.empty;
  }

  getErrors(): BoardErrors {
    return this.errors;
  }

  addCellError(cell: Cell, error: CellError): void {
    this.errors.addCellError(cell, error);
  }

  addGroupError(group: Group, known: Known, error: GroupError): void {
    this.errors.addGroupError(group, known, error);
  }
}

export class BoardErrors {
  readonly cells: Map<Cell, CellError>;
  readonly groups: Map<Group, Map<Known, GroupError>>;

  constructor(
    cells?: Map<Cell, CellError>,
    groups?: Map<Group, Map<Known, GroupError>>
  ) {
    this.cells = cells || new Map<Cell, CellError>();
    this.groups = groups || new Map<Group, Map<Known, GroupError>>();
  }

  clone(): BoardErrors {
    return new BoardErrors(
      deepCloneMap(this.cells),
      deepCloneMap(this.groups, deepCloneMap)
    );
  }

  get empty(): boolean {
    return this.cells.size === 0 && this.groups.size === 0;
  }

  addCellError(cell: Cell, error: CellError): void {
    this.cells.set(cell, error);
  }

  addGroupError(group: Group, known: Known, error: GroupError): void {
    deepSet(this.groups, known, error, group);
  }
}

export enum CellError {
  /**
   * The unsolved cell has no candidates remaining.
   */
  Unsolvable,
  /**
   * The solved cell sees another cell with the same solution.
   */
  Duplicate,
}

export enum GroupError {
  /**
   * The group has a known with no candidate cells remaining.
   */
  Unsolvable,
  /**
   * The group has two solved cells with the same solution.
   */
  Duplicate,
}

/**
 * Generates every cell that contains exactly N candidates.
 *
 * Each cell will be visited at most once.
 */
export function* cellsWithNCandidates(
  board: ReadableBoard,
  n: 1 | 2 | 3 | 4 | 5
): Generator<[Cell, Set<Known>]> {
  for (const cell of GRID.cells.values()) {
    const candidates = board.getCandidates(cell);

    if (candidates.size === n) {
      yield [cell, candidates];
    }
  }
}

/**
 * Generates every cell tuple that form the N candidate cells for each known within a group.
 *
 * Each unique known and group combination will be visited at most once.
 */
export function* knownsWithNCandidates(
  board: ReadableBoard,
  n: 1 | 2 | 3 | 4 | 5
): Generator<[Known, Group, Set<Cell>]> {
  for (const known of ALL_KNOWNS) {
    for (const [_, groups] of GRID.groups) {
      for (const [_, group] of groups) {
        const candidates = board.getCandidateCells(group, known);

        if (candidates.size === n) {
          yield [known, group, candidates];
        }
      }
    }
  }
}

export function removedCandidates(
  from: ReadableBoard,
  to: ReadableBoard
): Map<Cell, Set<Known>> {
  const removals = new Map<Cell, Set<Known>>();

  for (const cell of GRID.cells.values()) {
    const removed = difference(
      from.getCandidates(cell),
      to.getCandidates(cell)
    );

    if (removed.size) {
      removals.set(cell, removed);
    }
  }

  return removals;
}

export type CellChanges = { set?: Known; marks?: Set<Known> };

export function changes(
  from: ReadableBoard,
  to: ReadableBoard
): Map<Cell, CellChanges> {
  const changes = new Map<Cell, CellChanges>();

  for (const cell of GRID.cells.values()) {
    const fromValue = from.getValue(cell);
    const toValue = to.getValue(cell);
    const fromCandidates = from.getCandidates(cell);
    const toCandidates = to.getCandidates(cell);

    if (fromValue !== UNKNOWN) {
      if (toValue !== UNKNOWN && toValue !== fromValue) {
        changes.set(cell, { set: toValue });
      }

      // TODO Handle clears?
    } else if (toValue !== UNKNOWN) {
      changes.set(cell, {
        set: toValue,
        marks: excluding(fromCandidates, toValue),
      });
    } else {
      changes.set(cell, { marks: difference(fromCandidates, toCandidates) });
    }
  }

  return changes;
}

/**
 * Thrown when attempting to set a cell to a value that is not a candidate.
 */
class NotCandidateError extends Error {
  constructor(cell: Cell, to: Known, candidates: Set<Known>) {
    super(
      `Cannot set ${cell.toString()} to ${to} not in ${stringFromKnownSet(
        candidates
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
