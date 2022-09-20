import { Known, stringFromKnownSet } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { printGroupCandidates } from "../models/printers";
import { Move, Strategy } from "../models/solutions";
import { ReadableState } from "../models/state";

import { difference, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for naked pairs to determine pencil marks to remove.
 * Removes found knowns from other cells.
 *
 * Example: This shows a naked pair of (5, 6) in cells (4, 6).
 *
 *        ↓ ↓
 *     123456789  ←-- cell group index
 *   1 ··1·····1    | cell candidates
 *   2 ··2·····2    |
 *   3 ·········    ↓
 *   4 ·········
 * → 5 ···5·5···
 * → 6 ··66·6··6  ←-- remove 6 from cells 3 and 9
 *   7 ·········      (coincidence that hidden pair [1, 2] has same result)
 *   8 ·········
 *   9 ·········
 */
export default function solveNakedPairs(state: ReadableState): Move[] {
  const moves: Move[] = [];

  for (const [g, groups] of BOARD.groups) {
    for (const [_, group] of groups) {
      const pairs = new Map(
        [...group.cells.values()]
          .map(
            (cell) => [cell, state.getCandidates(cell)] as [Cell, Set<Known>]
          )
          .filter(([_, knowns]) => knowns.size === 2)
      );
      if (pairs.size < 2) {
        continue;
      }

      for (const [c1, ks1] of pairs) {
        for (const [c2, ks2] of pairs) {
          if (c2.point.i[g] <= c1.point.i[g]) {
            continue;
          }

          const ks1ks2 = union(ks1, ks2);
          if (ks1ks2.size !== 2) {
            continue;
          }

          const pair = new Set([c1, c2]);
          const erase = new Map<Known, Set<Cell>>();
          const move = new Move(Strategy.NakedPair)
            .group(group)
            .clue(pair, ks1ks2);

          for (const k of ks1ks2) {
            const diff = difference(state.getCandidateCells(group, k), pair);
            if (diff.size) {
              erase.set(k, diff);
              move.mark(diff, k);
            }
          }

          if (move.isEmpty()) {
            LOG &&
              console.info(
                "empty naked pair",
                stringFromKnownSet(ks1ks2),
                "in",
                group.name,
                Cell.stringFromGroupCoords(g, pair)
              );
            continue;
          }

          LOG && printGroupCandidates(state, group);
          LOG &&
            console.info(
              "SOLVE NAKED PAIR",
              stringFromKnownSet(ks1),
              "in",
              group.name,
              Cell.stringFromGroupCoords(g, pair),
              "erase",
              ...[...erase.entries()].flatMap(([k, cells]) => [
                k,
                Cell.stringFromPoints(cells),
              ])
            );
          // LOG && move.log();

          moves.push(move);
        }
      }
    }
  }

  return moves;
}
