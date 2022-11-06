import { Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Move, Strategy } from "../models/move";

import {
  difference,
  distinctPairs,
  intersect,
  singleSetValue,
  twoSetValues,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for one cell with two candidates AB and two more cells it can see
 * with two candidates AC and BC. The C candidate can be removed from every
 * cell that can see both of the last two cells.
 *
 * Example: The 7s in cells 13, 25 and 26.
 *
 *      1   2   3   4   5   6
 *     ··· ··· ··· | ··· ··· ···
 *   1 ··· ·5· ··· | ··· ·5· ···
 *     ··· ··9 ··7 | ··· 7·· ···
 *                 |
 *     ··· ··· ··· | ··· ··· ···
 *   2 ··· ··· ··· | ··· ··· ···
 *     7·9 ··· ··· | ··· ··7 ··7
 *
 * "9..24.... .5.69.231 .2..5..9. .9.7..32. ..29356.7 .7...29.. .69.2..73 51..79.62 2.7.86..9"
 *
 * @link https://www.sudokuwiki.org/y_wing_strategy
 */
export default function solveYWings(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  const pairs = new Map(
    Array.from(GRID.cells.values())
      .map((c) => [c, board.getCandidates(c)] as [Cell, Set<Known>])
      .filter(([_, ks]) => ks.size === 2)
  );
  const cells = new Set(pairs.keys());

  for (const [cell, pair] of pairs) {
    const [k1, k2] = twoSetValues(pair);
    const neighbors = intersect(cell.neighbors, cells);
    if (neighbors.size < 2) {
      continue;
    }

    LOG &&
      console.info(
        "[y-wing] PAIR",
        cell.toString(),
        stringFromKnownSet(pair),
        "sees",
        Cell.stringFromPoints(neighbors)
      );

    for (const [c1, c2] of distinctPairs(neighbors)) {
      if (c1.sees(c2)) {
        // would be naked triple
        continue;
      }

      const ks1 = pairs.get(c1)!;
      const ks2 = pairs.get(c2)!;
      if (!(ks1.has(k1) && ks2.has(k2)) && !(ks1.has(k2) && ks2.has(k1))) {
        continue;
      }

      const ks = difference(union(ks1, ks2), pair);
      if (ks.size !== 1) {
        continue;
      }

      const mark = singleSetValue(ks);
      if (!ks1.has(mark) || !ks2.has(mark)) {
        continue;
      }

      const markCells = Array.from(c1.commonNeighbors.get(c2)!).filter((c) =>
        board.getCandidates(c).has(mark)
      );
      if (!markCells.length) {
        LOG &&
          console.info(
            "[y-wing] NOPE",
            c1.toString(),
            stringFromKnownSet(ks1),
            c2.toString(),
            stringFromKnownSet(ks2),
            "x",
            mark
          );

        continue;
      }

      LOG &&
        console.info(
          "[y-wing] FOUND",
          c1.toString(),
          stringFromKnownSet(ks1),
          c2.toString(),
          stringFromKnownSet(ks2),
          "x",
          mark,
          Cell.stringFromPoints(markCells)
        );

      moves.push(
        Move.start(Strategy.YWing)
          .clue(cell, pair)
          .clue(c1, pair)
          .clue(c1, mark, "yellow")
          .clue(c2, pair)
          .clue(c2, mark, "yellow")
          .mark(markCells, mark)
      );
    }
  }

  return moves;
}
