import { ALL_KNOWNS, Grouping, Known } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";
import { CROSS, EMPTY, REMOVE_MARK } from "../models/symbols";

import {
  areEqual,
  difference,
  distinctPairs,
  distinctTriples,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for the X-Wing, Swordfish and Jellyfish patterns.
 */
export default function solveAbstractFish(
  strategy: Strategy,
  name: string,
  tupleSizes: number[],
  mainsPicker: (fishGroups: FishGroup[]) => FishGroup[][],
  board: ReadableBoard
): Moves {
  const moves = Moves.createEmpty();

  for (const k of ALL_KNOWNS) {
    for (const groups of [GRID.rows, GRID.columns]) {
      const candidates = Array.from(groups.values())
        .map((g) => [g, board.getCandidateCells(g, k)] as [Group, Set<Cell>])
        .filter(([_, cells]) => tupleSizes.includes(cells.size))
        .map(([g, cells]) => new FishGroup(g, cells));

      for (const fgs of mainsPicker(candidates)) {
        const fish = new Fish(fgs);
        if (!fish.isValid(name, k)) {
          continue;
        }

        const markCells = difference(
          Array.from(fish.crosses)
            .map((cross) => board.getCandidateCells(cross, k))
            .reduce(union, new Set()),
          fish.cells
        );

        if (!markCells.size) {
          LOG &&
            console.info(
              `[${name}] EMPTY`,
              k,
              ...Array.from(fish.mains).map((g) => g.name),
              CROSS,
              ...Array.from(fish.crosses).map((g) => g.name),
              EMPTY
            );

          continue;
        }

        LOG &&
          console.info(
            `[${name}] FOUND`,
            k,
            ...Array.from(fish.mains).map((g) => g.name),
            CROSS,
            ...Array.from(fish.crosses).map((g) => g.name),
            REMOVE_MARK,
            Cell.stringFromPoints(markCells)
          );

        moves
          .start(strategy)
          .group(fish.mains)
          .clue(fish.cells, k)
          .mark(markCells, k);
      }
    }
  }

  return moves;
}

class FishGroup {
  readonly main: Group;
  readonly crosses: Set<Group>;
  readonly cells: Set<Cell>;

  constructor(main: Group, cells: Set<Cell>) {
    this.main = main;
    this.cells = cells;

    const cross =
      main.grouping === Grouping.ROW ? Grouping.COLUMN : Grouping.ROW;
    this.crosses = new Set(Array.from(cells).map((c) => c.groups.get(cross)!));
  }
}

class Fish {
  readonly groups: FishGroup[];
  readonly mains: Set<Group>;
  readonly crosses: Set<Group>;
  readonly cells: Set<Cell>;

  constructor(groups: FishGroup[]) {
    this.groups = groups;
    this.mains = new Set(groups.map((g) => g.main));
    this.crosses = groups.map((g) => g.crosses).reduce(union, new Set());
    this.cells = groups.map((g) => g.cells).reduce(union, new Set());
  }

  isValid(name: string, k: Known): boolean {
    const size = this.groups.length;
    if (size !== this.crosses.size) {
      return false;
    }

    if (size > 2) {
      // no two share only the same two cross groups (would be an X-Wing)
      const sizeTwoCrosses = this.groups
        .map((fg) => [fg.main, fg.crosses] as [Group, Set<Group>])
        .filter(([_, s]) => s.size === 2);
      for (const [[am, ac], [bm, bc]] of distinctPairs(sizeTwoCrosses)) {
        if (areEqual(ac, bc)) {
          LOG &&
            console.info(
              `[${name}] IGNORE X-Wing`,
              k,
              ...[am, bm].map((g) => g.name),
              CROSS,
              ...Array.from(ac).map((g) => g.name)
            );

          return false;
        }
      }
    }

    if (size > 3) {
      // no three share only the same three cross groups (would be a Swordfish)
      const sizeTwoOrThreeCrosses = this.groups
        .map((fg) => [fg.main, fg.crosses] as [Group, Set<Group>])
        .filter(([_, s]) => s.size < 4);
      for (const [[am, ac], [bm, bc], [cm, cc]] of distinctTriples(
        sizeTwoOrThreeCrosses
      )) {
        const crosses = union(union(ac, bc), cc);
        if (crosses.size <= 3) {
          LOG &&
            console.info(
              `[${name}] IGNORE Swordfish`,
              k,
              ...[am, bm, cm].map((g) => g.name),
              CROSS,
              ...Array.from(crosses).map((g) => g.name)
            );

          return false;
        }
      }
    }

    return true;
  }
}
