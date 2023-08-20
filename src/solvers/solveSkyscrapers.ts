import { ALL_KNOWNS } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";
import { REMOVE_MARK } from "../models/symbols";

import {
  distinctPairs,
  fourValues,
  twoValues,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for two rows (columns) each with two cells remaining for a candidate
 * and one pair of those cells in the same column (row).
 *
 * That candidate may be removed from all cells that see both of the nonaligned cells.
 *
 * Example:
 *
 *     123456789
 *   A ·········
 *   B ·········
 *   C ·········
 *   D 7····7···  ←-- the 7s in D16 and G17 form the pattern
 *   E ·7···77··  ←-- remove 7 from E7 that sees D6 and G7
 *   F ·········
 *   G 7·····7··  ←--
 *   H ·········
 *   J ·········
 *
 * "697.....2 ..1972.63 ..3..679. 912...6.7 374.6.95. 8657.9.24 148693275 7.9.24..6 ..68.7..9"
 *
 * @link https://hodoku.sourceforge.net/en/tech_sdp.php
 */
export default function solveSkyscrapers(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();

  for (const k of ALL_KNOWNS) {
    for (const groups of [GRID.rows, GRID.columns]) {
      const candidates = Array.from(groups.values())
        .map((g) => [g, board.getCandidateCells(g, k)] as [Group, Set<Cell>])
        .filter(([_, cells]) => cells.size === 2);

      for (const [[group1, cells1], [_, cells2]] of distinctPairs(candidates)) {
        const cross = group1.cross;
        const cells = union(cells1, cells2);
        const [c11, c12] = twoValues(cells1);
        const [c21, c22] = twoValues(cells2);

        LOG &&
          console.info(
            "[skyscraper] CHECK",
            c11.key,
            c12.key,
            "and",
            c21.key,
            c22.key,
            k
          );

        const found = [
          [c11, c21, c12, c22],
          [c11, c22, c12, c21],
          [c12, c21, c11, c22],
          [c12, c22, c11, c21],
        ].find(
          ([c1a, c2a, c1o, c2o]) =>
            c1a!.groups.get(cross) === c2a!.groups.get(cross) &&
            c1o!.groups.get(cross) !== c2o!.groups.get(cross)
        );

        if (!found) {
          continue;
        }

        const [c1a, c2a, c1o, c2o] = fourValues(found);
        const erase = new Set<Cell>();

        for (const cell of c1o.commonNeighbors.get(c2o)!) {
          if (!cells.has(cell) && board.isCandidate(cell, k)) {
            erase.add(cell);
          }
        }

        if (erase.size) {
          LOG &&
            console.info(
              "[skyscraper] FOUND",
              c1a.key,
              c1o.key,
              "and",
              c2a.key,
              c2o.key,
              k,
              REMOVE_MARK,
              Cell.stringFromPoints(erase)
            );

          moves
            .start(Strategy.Skyscraper)
            // .group(group1)
            // .group(group2)
            .clue([c1a, c2a], k, "blue")
            .clue([c1o, c2o], k, "yellow")
            .mark(erase, k);
        }
      }
    }
  }

  return moves;
}
