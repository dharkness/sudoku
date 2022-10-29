import { ALL_KNOWNS, Grouping } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Move, Strategy } from "../models/solutions";

import {
  areEqual,
  difference,
  distinctPairs,
  distinctTriples,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for three rows/columns with two or three candidate cells for a known
 * that all lie on the same three cross columns/rows.
 *
 * The known can be removed from other cells in the same columns/rows.
 *
 * Example: This grid of cells having 4 as a candidate shows a Swordfish in rows 2, 5 and 7
 *
 *      ↓ ↓   ↓
 *     123456789
 *   1 ·········
 * → 2 ···4···4·
 *   3 ·4·······  ←-- remove 4 from cell 32
 *   4 ·········
 * → 5 ·4·4···4·
 *   6 ·········
 * → 7 ·4·4·····
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * 3x3x3 columns "52941.7.3 ..6..3..2 ..32..... .523...76 637.5.2.. 19.62753. 3...6942. 2..83.6.. 96.7423.5"
 * 2x2x2 columns "926...1.. 537.1.42. 841...6.3 259734816 714.6..3. 36812..4. 1.2....84 485.7136. 6.3.....1"
 * 3x2x3 rows    ".2..43.69 ..38962.. 96..25.3. 89.56..13 6...3.... .3..81.26 3...1..7. ..96743.2 27.358.9."
 */
export default function solveSwordfish(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const k of ALL_KNOWNS) {
    for (const groups of [GRID.rows, GRID.columns]) {
      const candidates = Array.from(groups.values())
        .map((g) => [g, board.getCandidateCells(g, k)] as [Group, Set<Cell>])
        .filter(([_, cells]) => [2, 3].includes(cells.size))
        .map(([g, cells]) => new FishGroup(g, cells));

      for (const fgs of distinctTriples(candidates)) {
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
              "[swordfish] EMPTY",
              k,
              ...Array.from(fish.mains).map((g) => g.name),
              "x",
              ...Array.from(fish.crosses).map((g) => g.name)
            );

          continue;
        }

        LOG &&
          console.info(
            "[swordfish] SOLVE",
            k,
            ...Array.from(fish.mains).map((g) => g.name),
            "x",
            ...Array.from(fish.crosses).map((g) => g.name),
            "∉",
            Cell.stringFromPoints(markCells)
          );

        moves.push(
          new Move(Strategy.Swordfish)
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
    if (this.groups.length !== 3) {
      return false;
    }

    if (this.crosses.size !== 3) {
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
            "[swordfish] X-WING",
            ...[am, bm].map((g) => g.name),
            "x",
            ...Array.from(ac).map((g) => g.name)
          );

        return false;
      }
    }

    return true;
  }
}
