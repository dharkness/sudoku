import { Known, stringFromKnownSet } from "../models/basics";
import { printGroupPossibles } from "../models/printers";
import { Solutions } from "../models/solutions";
import { ReadableState } from "../models/state";
import { BOARD, Cell } from "../models/board";

import { difference, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for naked triples to determine pencil marks to remove.
 * Removes found knowns from other cells.
 *
 * Example: This shows a naked triple of (3, 7, 9) in cells (2, 6, 9).
 *
 *      ↓   ↓  ↓
 *     123456789  ←-- cell group index
 *   1 ·········    | cell possibles
 *   2 ·········    |
 * → 3 ·3···3··3    ↓
 *   4 ·········
 *   5 5·····5··
 *   6 66·6·66·6  ←-- remove 6 from cells 1, 4 and 7
 * → 7 ·7···7··7
 *   8 ···8·8···
 * → 9 ·9······9
 */
export default function solveNakedTriples(
  state: ReadableState,
  solutions: Solutions
): void {
  for (const [g, groups] of BOARD.groups) {
    for (const [_, group] of groups) {
      const triples = new Map(
        [...group.cells.values()]
          .map(
            (cell) =>
              [cell, state.getPossibleKnowns(cell)] as [Cell, Set<Known>]
          )
          .filter(([_, knowns]) => 2 <= knowns.size && knowns.size <= 3)
      );
      if (triples.size < 3) {
        continue;
      }

      for (const [c1, ks1] of triples) {
        for (const [c2, ks2] of triples) {
          const ks1ks2 = union(ks1, ks2);
          if (c2.point.i[g] <= c1.point.i[g] || ![2, 3].includes(ks1ks2.size)) {
            continue;
          }

          for (const [c3, ks3] of triples) {
            const ks1ks2ks3 = union(ks1ks2, ks3);
            if (
              c3.point.i[g] <= c2.point.i[g] ||
              ![2, 3].includes(ks1ks2ks3.size)
            ) {
              continue;
            }

            const triple = new Set([c1, c2, c3]);
            const erase = new Map<Known, Set<Cell>>();
            for (const k of ks1ks2ks3) {
              const diff = difference(state.getPossibleCells(group, k), triple);
              if (diff.size) {
                erase.set(k, diff);
              }
            }
            if (!erase.size) {
              LOG &&
                console.info(
                  "empty naked triple",
                  stringFromKnownSet(ks1ks2ks3),
                  "in",
                  group.name,
                  Cell.stringFromPoints(triple)
                );
              continue;
            }

            LOG && printGroupPossibles(state, group);
            LOG &&
              console.info(
                "SOLVE NAKED TRIPLE",
                stringFromKnownSet(ks1ks2ks3),
                "in",
                group.name,
                Cell.stringFromGroupCoords(g, triple),
                "erase",
                ...[...erase.entries()].flatMap(([k, cells]) => [
                  k,
                  Cell.stringFromPoints(cells),
                ])
              );

            for (const [k, cells] of erase) {
              for (const cell of cells) {
                solutions.addErasedPencil(cell, k);
              }
            }
          }
        }
      }
    }
  }
}
