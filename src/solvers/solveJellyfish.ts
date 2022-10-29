import { ALL_KNOWNS, Grouping } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Move, Strategy } from "../models/solutions";

import {
  areEqual,
  difference,
  distinctPairs,
  distinctQuads,
  distinctTriples,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for four rows/columns with two to four candidate cells for a known
 * that all lie on the same four cross columns/rows.
 *
 * The known can be removed from other cells in the same columns/rows.
 *
 * Example: This grid of cells having 4 as a candidate shows a Jellyfish in rows 2, 3, 5 and 7
 *
 *      ↓ ↓↓  ↓
 *     123456789
 *   1 ·········
 * → 2 ···44··4·
 * → 3 ·4··4····
 *   4 ···44····  ←-- remove 4 from cells 44 and 45
 * → 5 ·4·4···4·
 *   6 ·········
 * → 7 ·4·44····
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * 3x2x3x3 rows "..17538.. .5......7 7..89.1.. ...6.157. 625478931 .179.54.. ....67..4 .7.....1. ..63.97.."
 * 3x4x2x2 rows "......... .7..3.92. .19.2563. ..4...21. ......... .57.9.46. .9514.37. ......... .4236759."
 * 4x4x4x4 rows ".5.749.8. .89..3... 6....139. .4...7.6. ...4..8.9 ......... .6...4.1. 5..21..47 .1...5.3."
 */
export default function solveJellyfish(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const k of ALL_KNOWNS) {
    for (const groups of [GRID.rows, GRID.columns]) {
      const candidates = Array.from(groups.values())
        .map((g) => [g, board.getCandidateCells(g, k)] as [Group, Set<Cell>])
        .filter(([_, cells]) => [2, 3, 4].includes(cells.size))
        .map(([g, cells]) => new FishGroup(g, cells));

      for (const fgs of distinctQuads(candidates)) {
        const fish = new Fish(fgs);
        if (!fish.isValid()) {
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
              "[jellyfish] EMPTY",
              k,
              ...Array.from(fish.mains).map((g) => g.name),
              "x",
              ...Array.from(fish.crosses).map((g) => g.name)
            );

          continue;
        }

        LOG &&
          console.info(
            "[jellyfish] SOLVE",
            k,
            ...Array.from(fish.mains).map((g) => g.name),
            "x",
            ...Array.from(fish.crosses).map((g) => g.name),
            "∉",
            Cell.stringFromPoints(markCells)
          );

        moves.push(
          new Move(Strategy.Jellyfish)
            .group(fish.mains)
            .clue(fish.cells, k)
            .mark(markCells, k)
        );
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

  isValid(): boolean {
    if (this.groups.length !== 4) {
      return false;
    }

    if (this.crosses.size !== 4) {
      return false;
    }

    // no two share only the same two cross groups (would be an X-Wing)
    const sizeTwoCrosses = this.groups
      .map((fg) => [fg.main, fg.crosses] as [Group, Set<Group>])
      .filter(([_, s]) => s.size === 2);
    for (const [[am, ac], [bm, bc]] of distinctPairs(sizeTwoCrosses)) {
      if (areEqual(ac, bc)) {
        LOG &&
          console.info(
            "[jellyfish] X-WING",
            ...[am, bm].map((g) => g.name),
            "x",
            ...Array.from(ac).map((g) => g.name)
          );

        return false;
      }
    }

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
            "[jellyfish] SWORDFISH",
            ...[am, bm, cm].map((g) => g.name),
            "x",
            ...Array.from(crosses).map((g) => g.name)
          );

        return false;
      }
    }

    return true;
  }
}
