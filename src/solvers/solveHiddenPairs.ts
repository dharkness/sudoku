import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { printGroupCandidates } from "../models/printers";
import { Move, Strategy } from "../models/solutions";

import { difference, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for hidden pairs to determine candidates to remove.
 * Removes other knowns from found cells.
 *
 * Example: This shows a hidden pair of (1, 7) in cells (2, 6).
 *
 *      ↓   ↓
 *     123456789  ←-- cell group index
 * → 1 ·1···1···    | cell candidates
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
export default function solveHiddenPairs(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const [_, groups] of GRID.groups) {
    for (const [_, group] of groups) {
      const pairs = new Map(
        ALL_KNOWNS.map(
          (k) => [k, board.getCandidateCells(group, k)] as [Known, Set<Cell>]
        ).filter(([_, cells]) => cells.size === 2)
      );
      if (pairs.size < 2) {
        continue;
      }

      for (const [k1, cs1] of pairs) {
        for (const [k2, cs2] of pairs) {
          if (k2 <= k1) {
            continue;
          }

          const cs1cs2 = union(cs1, cs2);
          if (cs1cs2.size !== 2) {
            continue;
          }

          const pair = new Set([k1, k2]);
          const erase = new Map<Cell, Set<Known>>();
          const move = new Move(Strategy.HiddenPair)
            .group(group)
            .clue(cs1cs2, pair);

          for (const cell of cs1cs2) {
            const diff = difference(board.getCandidates(cell), pair);
            if (diff.size) {
              erase.set(cell, diff);
              move.mark(cell, diff);
            }
          }

          if (move.isEmpty()) {
            LOG &&
              console.info(
                "empty hidden pair",
                stringFromKnownSet(pair),
                "in",
                Cell.stringFromPoints(cs1cs2)
              );
            continue;
          }

          LOG && printGroupCandidates(board, group);
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
          // LOG && move.log();

          moves.push(move);
        }
      }
    }
  }

  return moves;
}
