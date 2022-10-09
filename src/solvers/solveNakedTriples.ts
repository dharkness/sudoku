import { Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { printGroupCandidates } from "../models/printers";
import { Move, Strategy } from "../models/solutions";

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
 *   1 ·········    | cell candidates
 *   2 ·········    |
 * → 3 ·3···3··3    ↓
 *   4 ·········
 *   5 5·····5··
 *   6 66·6·66·6  ←-- remove 6 from cells 1, 4 and 7
 * → 7 ·7···7··7
 *   8 ···8·····
 * → 9 ·········
 */
export default function solveNakedTriples(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const [g, groups] of GRID.groups) {
    for (const [_, group] of groups) {
      const triples = new Map(
        [...group.cells.values()]
          .map(
            (cell) => [cell, board.getCandidates(cell)] as [Cell, Set<Known>]
          )
          .filter(([_, knowns]) => 2 <= knowns.size && knowns.size <= 3)
      );
      if (triples.size < 3) {
        continue;
      }

      for (const [c1, ks1] of triples) {
        for (const [c2, ks2] of triples) {
          if (c2.point.i[g] <= c1.point.i[g]) {
            continue;
          }

          const ks1ks2 = union(ks1, ks2);
          if (ks1ks2.size < 3) {
            // ignore naked pair
            continue;
          }

          for (const [c3, ks3] of triples) {
            if (c3.point.i[g] <= c2.point.i[g]) {
              continue;
            }

            if (union(ks1, ks3).size < 3 || union(ks2, ks3).size < 3) {
              // ignore naked pair
              continue;
            }

            const ks1ks2ks3 = union(ks1ks2, ks3);
            if (ks1ks2ks3.size !== 3) {
              continue;
            }

            const triple = new Set([c1, c2, c3]);
            const erase = new Map<Known, Set<Cell>>();
            const move = new Move(Strategy.NakedTriple)
              .group(group)
              .clue(triple, ks1ks2);

            for (const k of ks1ks2ks3) {
              const diff = difference(
                board.getCandidateCells(group, k),
                triple
              );
              if (diff.size) {
                erase.set(k, diff);
                move.mark(diff, k);
              }
            }

            if (move.isEmpty()) {
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

            LOG && printGroupCandidates(board, group);
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
            // LOG && move.log();

            moves.push(move);
          }
        }
      }
    }
  }

  return moves;
}
