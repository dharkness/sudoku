import { ALL_KNOWNS, Coord, Grouping } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell, Group } from "../models/grid";
import { Move, Strategy } from "../models/solutions";

import { difference } from "../utils/collections";

const LOG = false;

/**
 * Looks for X-Wings in rows and columns to determine pencil marks to remove.
 * Removes found known from other cells in opposite row/column.
 *
 * Example: This grid of cells having 4 as a candidate shows an X-Wing in rows 2 and 5
 *
 *        ↓   ↓
 *     123456789
 *   1 ·········
 *   2 ···4···4·
 *   3 ·········
 *   4 ·········
 * → 5 ···4···4·
 * → 6 ·········
 *   7 ···4·····  ←-- remove 4 from cell 74
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * "1.....569 492.561.8 .561.924. ..964.8.1 .64.1.... 218.356.4 .4.5...16 9.5.614.2 621.....5"
 */
export default function solveXWings(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  const iterations = [
    [Grouping.ROW, GRID.rows, Grouping.COLUMN, GRID.columns],
    [Grouping.COLUMN, GRID.columns, Grouping.ROW, GRID.rows],
  ] as [Grouping, Map<Coord, Group>, Grouping, Map<Coord, Group>][];

  for (const [g1, groups1, g2, groups2] of iterations) {
    for (const k of ALL_KNOWNS) {
      for (const [i1, group1] of groups1) {
        const cells1 = board.getCandidateCells(group1, k);
        if (cells1.size !== 2) {
          continue;
        }

        for (const [i2, group2] of groups1) {
          if (i2 <= i1) {
            continue;
          }

          const cells2 = board.getCandidateCells(group2, k);
          if (cells2.size !== 2) {
            continue;
          }

          const [cell11, cell12] = [...cells1];
          const [cell21, cell22] = [...cells2];
          if (
            cell11!.point.i[g1] !== cell21!.point.i[g1] ||
            cell12!.point.i[g1] !== cell22!.point.i[g1]
          ) {
            continue;
          }

          const xwing = new Set([cell11, cell12, cell21, cell22] as Cell[]);
          const erase = new Set<Cell>();
          const move = new Move(Strategy.XWing)
            .group(group1)
            .group(group2)
            .clue(xwing, k);

          for (const otherGroup of [
            groups2.get(cell11!.point.i[g1])!,
            groups2.get(cell12!.point.i[g1])!,
          ]) {
            const diff = difference(
              board.getCandidateCells(otherGroup, k),
              xwing
            );
            if (diff.size) {
              for (const cell of diff) {
                erase.add(cell!);
              }
              move.mark(diff, k);
            }
          }

          if (move.isEmpty()) {
            LOG &&
              console.info(
                "empty X-Wing for",
                k,
                "in",
                `${Grouping[g1]}S`,
                group1.coord + 1,
                "and",
                group2.coord + 1,
                `${Grouping[g2]}S`,
                cell11!.point.i[g1] + 1,
                "and",
                cell12!.point.i[g1] + 1
              );
            continue;
          }

          LOG &&
            console.info(
              "SOLVE X-WING for",
              k,
              "in",
              `${Grouping[g1]}S`,
              group1.coord + 1,
              "and",
              group2.coord + 1,
              `${Grouping[g2]}S`,
              cell11!.point.i[g1] + 1,
              "and",
              cell12!.point.i[g1] + 1,
              "erase",
              Cell.stringFromPoints(erase)
            );

          moves.push(move);
        }
      }
    }
  }

  return moves;
}
