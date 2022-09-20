import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { printGroupCandidates } from "../models/printers";
import { Move, Strategy } from "../models/solutions";
import { ReadableState } from "../models/state";

import { difference, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for hidden triples to determine pencil marks to remove.
 * Removes other knowns from found cells.
 *
 * Example: This shows a hidden triple of (1, 7) in cells (2, 6).
 *
 *     ↓  ↓ ↓
 *     123456789  ←-- cell group index
 *   1 ·········    | cell candidates
 *   2 ···2·2222    |
 *   3 ·········    ↓
 * → 4 ···4·4···
 * → 5 5··5·5···
 *   6 6··6·6666
 *   7 ·····7·77
 *   8 ·········
 * → 9 9··9·9···
 *     ↑  ↑ ↑
 *     |  | remove 2, 6 and 7 from cell 6
 *     |  remove 2 and 6 from cell 4
 *     remove 6 from cell 1
 */
export default function solveHiddenTriples(state: ReadableState): Move[] {
  const moves: Move[] = [];

  for (const [_, groups] of BOARD.groups) {
    for (const [_, group] of groups) {
      const triples = new Map(
        ALL_KNOWNS.map(
          (k) => [k, state.getCandidateCells(group, k)] as [Known, Set<Cell>]
        ).filter(([_, cells]) => 2 <= cells.size && cells.size <= 3)
      );
      if (triples.size < 3) {
        continue;
      }

      for (const [k1, cs1] of triples) {
        for (const [k2, cs2] of triples) {
          if (k2 <= k1) {
            continue;
          }

          const cs1cs2 = union(cs1, cs2);
          if (cs1cs2.size < 3) {
            // ignore hidden pair
            continue;
          }

          for (const [k3, cs3] of triples) {
            if (k3 <= k2) {
              continue;
            }

            if (union(cs1, cs3).size < 3 || union(cs2, cs3).size < 3) {
              // ignore naked pair
              continue;
            }

            const cs1cs2cs3 = union(cs1cs2, cs3);
            if (cs1cs2cs3.size !== 3) {
              continue;
            }

            const triple = new Set([k1, k2, k3]);
            const erase = new Map<Cell, Set<Known>>();
            const move = new Move(Strategy.HiddenTriple)
              .group(group)
              .clue(cs1cs2cs3, triple);

            for (const cell of cs1cs2cs3) {
              const diff = difference(state.getCandidates(cell), triple);
              if (diff.size) {
                erase.set(cell, diff);
                move.mark(cell, diff);
              }
            }

            if (move.isEmpty()) {
              LOG &&
                console.info(
                  "empty hidden triple",
                  stringFromKnownSet(triple),
                  "in",
                  Cell.stringFromPoints(cs1cs2cs3)
                );
              continue;
            }

            LOG && printGroupCandidates(state, group);
            LOG &&
              console.info(
                "SOLVE HIDDEN TRIPLE",
                stringFromKnownSet(triple),
                "in",
                group.name,
                "erase",
                ...[...erase.entries()].flatMap(([cell, knowns]) => [
                  cell.point.k,
                  stringFromKnownSet(knowns),
                ])
              );
            // LOG && move.log();

            moves.push(move);
          }
        }
      }
    }
  }

  return moves;
}
