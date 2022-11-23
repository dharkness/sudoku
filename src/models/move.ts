import { isArray } from "is-what";

import { Known, UNKNOWN } from "./basics";
import { WritableBoard } from "./board";
import {
  Borders,
  CellColor,
  Decoration,
  FULL_BORDERS,
  MarkColor,
  NO_BORDERS,
} from "./decoration";
import { Cell, Group } from "./grid";
import { solvedCellsFromPuzzleString } from "./puzzle-string";
import { Strategy } from "./strategy";
import { EMPTY, MISSING, REMOVE_MARK, SOLVE_CELL } from "./symbols";

import {
  deepCloneMap,
  deepCloneMapOfSets,
  isIterable,
} from "../utils/collections";

/**
 * Captures the strategy, clues (knowns and candidates), and the resulting changes
 * to make to the board as a result.
 *
 * Captures the player's moves as well to create a uniform interface.
 */
export class Move {
  /**
   * Starts a new move for the given strategy.
   */
  static start(strategy: Strategy): Move {
    return new Move(strategy);
  }

  /**
   * Creates a move containing the given sets.
   */
  static createFrom(strategy: Strategy, sets: Map<Cell, Known>): Move {
    return new this(strategy, null, null, sets, null);
  }

  readonly strategy: Strategy;
  readonly groups: Set<Group>;
  readonly clues: Map<Cell, Map<Known, MarkColor>>;

  readonly sets: Map<Cell, Known>;
  readonly marks: Map<Cell, Set<Known>>;

  private _key: string | null = null;

  private constructor(
    strategy: Strategy,
    groups?: Set<Group> | null,
    clues?: Map<Cell, Map<Known, MarkColor>> | null,
    sets?: Map<Cell, Known> | null,
    marks?: Map<Cell, Set<Known>> | null
  ) {
    this.strategy = strategy;
    this.groups = groups || new Set<Group>();
    this.clues = clues || new Map<Cell, Map<Known, MarkColor>>();
    this.sets = sets || new Map<Cell, Known>();
    this.marks = marks || new Map<Cell, Set<Known>>();
  }

  clone(): Move {
    return new Move(
      this.strategy,
      new Set(this.groups),
      deepCloneMap(this.clues, deepCloneMap),
      new Map(this.sets),
      deepCloneMapOfSets(this.marks)
    );
  }

  get key(): string {
    if (!this._key) {
      if (this.sets.size) {
        this._key = Array.from(this.sets.entries())
          .sort(([a], [b]) => a.compare(b))
          .map(([cell, known]) => `${cell.key}${SOLVE_CELL}${known}`)
          .join(MISSING);
      } else if (this.marks.size) {
        this._key = Array.from(this.marks.entries())
          .sort(([a], [b]) => a.compare(b))
          .map(
            ([cell, knowns]) =>
              `${cell.key}${REMOVE_MARK}${Array.from(knowns)
                .sort((a, b) => a - b)
                .join("")}`
          )
          .join(MISSING);
      } else {
        this._key = EMPTY;
      }
    }

    return this._key;
  }

  toString(): string {
    return this.key;
  }

  group(groups: Group | Iterable<Group> | IterableIterator<Group>): Move {
    if (isIterable(groups)) {
      for (const group of groups as Iterable<Group>) {
        this.groups.add(group);
      }
    } else {
      this.groups.add(groups as Group);
    }

    return this;
  }

  clue(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>,
    color: MarkColor = "green"
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        if (this.clues.has(cell)) {
          this.clues.get(cell)!.set(known, color);
        } else {
          this.clues.set(cell, new Map([[known, color]]));
        }
      }
    );
  }

  set(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        this.sets.set(cell, known);
      }
    );
  }

  mark(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>
  ): Move {
    return this.applyToCellsAndKnowns(
      cells,
      knowns,
      (cell: Cell, known: Known) => {
        if (this.marks.has(cell)) {
          this.marks.get(cell)!.add(known);
        } else {
          this.marks.set(cell, new Set([known]));
        }
      }
    );
  }

  private applyToCellsAndKnowns(
    cells: Cell | Iterable<Cell> | IterableIterator<Cell>,
    knowns: Known | Iterable<Known> | IterableIterator<Known>,
    apply: (c: Cell, k: Known) => void
  ): Move {
    if (isIterable(cells)) {
      if (isIterable(knowns)) {
        for (const c of cells as Iterable<Cell>) {
          for (const k of knowns as Iterable<Known>) {
            apply(c, k);
          }
        }
      } else {
        for (const c of cells as Iterable<Cell>) {
          apply(c, knowns as Known);
        }
      }
    } else {
      if (isIterable(knowns)) {
        for (const k of knowns as Iterable<Known>) {
          apply(cells as Cell, k);
        }
      } else {
        apply(cells as Cell, knowns as Known);
      }
    }

    return this;
  }

  isEmpty(): boolean {
    return this.sets.size === 0 && this.marks.size === 0;
  }

  // TODO Make this pretty or remove all solver logging in favor of showing in UI
  log() {
    console.info(
      `[${Strategy[this.strategy]}]`,
      ...Array.from(this.groups).map((g) => g.name),
      "clues",
      ...Array.from(this.clues.entries()).flatMap(([cell, colorsByKnown]) => [
        cell.key,
        Array.from(colorsByKnown.entries())
          .map(([known, color]) => `${known}:${color}`)
          .join(", "),
      ]),
      "sets",
      ...Array.from(this.sets.entries()).flatMap(([cell, known]) => [
        cell.key,
        known,
      ]),
      "marks",
      ...Array.from(this.marks.entries()).flatMap(([cell, known]) => [
        cell.key,
        ...known,
      ])
    );
  }

  getDecoration(cell: Cell): Decoration {
    return {
      borders: this.getBorders(cell),
      background: this.getBackground(cell),
      colors: this.getColors(cell),
      set: this.sets.get(cell) || UNKNOWN,
    };
  }

  getBorders(cell: Cell): Borders {
    if (this.groups.size) {
      return Array.from(this.groups)
        .map((group) => group.borders.get(cell))
        .filter(Boolean)
        .reduce(
          // @ts-ignore
          (borders: Borders, next: Borders) =>
            [
              borders[0] || next[0],
              borders[1] || next[1],
              borders[2] || next[2],
              borders[3] || next[3],
            ] as Borders,
          NO_BORDERS
        ) as Borders;
    } else if (this.sets.size) {
      if (this.sets.has(cell) && 0 < this.sets.size && this.sets.size < 10) {
        return FULL_BORDERS;
      }
    } else if (
      this.clues.size ||
      (0 < this.marks.size && this.marks.size < 10)
    ) {
      if (this.clues.has(cell) || this.marks.has(cell)) {
        return FULL_BORDERS;
      }
    }

    return NO_BORDERS;
  }

  getBackground(cell: Cell): CellColor | null {
    if (this.sets.has(cell)) {
      return "set";
    } else if (this.marks.has(cell)) {
      return "mark";
    } else if (this.clues.has(cell)) {
      return "clue";
    } else {
      return null;
    }
  }

  getColors(cell: Cell): Map<Known, MarkColor> {
    const clues = Array.from(this.clues.get(cell) || []);
    const marks = Array.from(this.marks.get(cell) || []);
    const set = this.sets.get(cell);

    return new Map<Known, MarkColor>([
      ...clues,
      ...marks.map((k) => [k, "red"]),
      ...(set ? [[set, "green"]] : []),
    ] as [Known, MarkColor][]);
  }

  apply(board: WritableBoard, moves: Moves) {
    for (const [cell, known] of this.sets) {
      if (!board.isSolved(cell) && board.isCandidate(cell, known)) {
        board.setKnown(cell, known, moves);
      }
    }

    for (const [cell, candidates] of this.marks) {
      if (!board.isSolved(cell)) {
        for (const candidate of candidates) {
          if (board.isCandidate(cell, candidate)) {
            board.removeCandidate(cell, candidate, true, moves);
          }
        }
      }
    }
  }
}

/**
 * Collects an ordered set of moves from an initial puzzle string,
 * solving cells or removing candidates on a board, or a solver.
 */
export class Moves implements Iterable<Move> {
  /**
   * Creates an empty set of moves.
   */
  static createEmpty(): Moves {
    return new Moves();
  }

  /**
   * Creates moves from the given values in a puzzle string.
   *
   * @see solvedCellsFromPuzzleString
   */
  static createFrom(values: string): Moves;

  /**
   * Creates moves from a collection of solved cells.
   */
  static createFrom(knowns: Map<Cell, Known>): Moves;

  /**
   * Creates moves from a list of existing moves.
   */
  static createFrom(moves: Move[]): Moves;

  /**
   * Creates moves from the given source.
   */
  static createFrom(source: string | Map<Cell, Known> | Move[]): Moves {
    if (typeof source === "string") {
      return this.createFrom(solvedCellsFromPuzzleString(source));
    } else if (isArray(source)) {
      return new Moves(source);
    } else {
      const givens = new Moves();

      for (const [cell, known] of source) {
        givens.start(Strategy.Given).set(cell, known);
      }

      return givens;
    }
  }

  private moves: Move[];

  private constructor(moves: Move[] = []) {
    this.moves = moves;
  }

  [Symbol.iterator](): Iterator<Move> {
    return this.moves[Symbol.iterator]();
  }

  start(strategy: Strategy): Move {
    const move = Move.start(strategy);

    this.moves.push(move);

    return move;
  }

  add(move: Move): Move {
    this.moves.push(move);

    return move;
  }

  concat(moves: Moves) {
    this.moves = this.moves.concat(moves.moves);
  }

  size(): number {
    return this.moves.length;
  }

  has(strategy: Strategy | Strategy[]): boolean {
    const filter = isArray(strategy)
      ? (m: Move) => strategy.includes(m.strategy)
      : (m: Move) => m.strategy === strategy;

    return !!this.moves.find(filter);
  }

  first(): Move | null {
    return this.moves[0] || null;
  }

  only(strategy: Strategy | Strategy[]): Moves {
    const filter = isArray(strategy)
      ? (m: Move) => strategy.includes(m.strategy)
      : (m: Move) => m.strategy === strategy;

    return Moves.createFrom(this.moves.filter(filter));
  }

  except(strategy: Strategy | Strategy[]): Moves {
    const filter = isArray(strategy)
      ? (m: Move) => !strategy.includes(m.strategy)
      : (m: Move) => m.strategy !== strategy;

    return Moves.createFrom(this.moves.filter(filter));
  }

  // FACTOR Remove strategy and use only()
  apply(board: WritableBoard, strategy?: Strategy | Strategy[]): Moves {
    const next = new Moves();
    const moves = (strategy ? this.only(strategy) : this).moves;

    for (const move of moves) {
      move.apply(board, next);
    }

    return next;
  }

  applyAll(board: WritableBoard, strategy?: Strategy | Strategy[]) {
    let moves = this as Moves;

    while ((moves = moves.apply(board, strategy)).size()) {
      // forever
    }
  }

  toString(): string {
    return this.moves.toString();
  }
}
