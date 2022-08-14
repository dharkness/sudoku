import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { printGroupPossibles } from "../models/printers";
import { Solutions } from "../models/solutions";
import { ReadableState } from "../models/state";
import { BOARD, Cell } from "../models/structure";

import { difference, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for hidden pairs to determine pencil marks to remove.
 * Removes other knowns from found cells.
 *
 * #xample: This shows a hidden pair of (1, 7) in cells (2, 6).
 *
 *      ↓   ↓
 *     123456789  ←-- cell group index
 * → 1 ·1···1···    | cell possibles
 *   2 ·········    |
 *   3 ·········    ↓
 *   4 ··4···4·4
 *   5 ···5·5··5
 *   6 ·········
 * → 7 ·7···7···
 *   8 ·88··8··8
 *   9 ·····99··
 *      ↑   ↑
 *      |   remove 5, 8, 9 from cell 6
 *      remove 8 from cell 2
 */
export default function solveHiddenPairs(
  state: ReadableState,
  solutions: Solutions
): void {
  for (const [_, groups] of BOARD.groups) {
    for (const [_, group] of groups) {
      const pairs = new Map(
        ALL_KNOWNS.map(
          (k) => [k, state.getPossibleCells(group, k)] as [Known, Set<Cell>]
        ).filter(([_, cells]) => cells.size === 2)
      );
      if (pairs.size < 2) {
        continue;
      }

      for (const [k1, cs1] of pairs) {
        for (const [k2, cs2] of pairs) {
          const cs1cs2 = union(cs1, cs2);
          if (k2 <= k1 || cs1cs2.size !== 2) {
            continue;
          }

          const pair = new Set([k1, k2]);
          const erase = new Map<Cell, Set<Known>>();
          for (const cell of cs1cs2) {
            const diff = difference(state.getPossibleKnowns(cell), pair);
            if (diff.size) {
              erase.set(cell, diff);
            }
          }
          if (!erase.size) {
            LOG &&
              console.info(
                "empty hidden pair",
                stringFromKnownSet(pair),
                "in",
                Cell.stringFromPoints(cs1cs2)
              );
            continue;
          }

          LOG && printGroupPossibles(state, group);
          LOG &&
            console.info(
              "SOLVE HIDDEN PAIR",
              stringFromKnownSet(pair),
              "in",
              group.name,
              "erase",
              ...[...erase.entries()].flatMap(([cell, knowns]) => [
                cell.point.k,
                stringFromKnownSet(knowns),
              ])
            );

          for (const [cell, knowns] of erase) {
            for (const k of knowns) {
              solutions.addErasedPencil(cell, k);
            }
          }
        }
      }
    }
  }
}
