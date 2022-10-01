import { ALL_KNOWNS } from "../models/basics";
import { BOARD, Cell, Column, Group, Row } from "../models/board";
import { ReadableState } from "../models/state";
import { Move, Strategy } from "../models/solutions";

import { difference, intersect, singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for blocks where all candidates are segregated into one row and one column.
 * If any conjugate pair (a row or column with only two candidates) has one
 * candidate cell on the same row (column), and its partner sees another
 * candidate on the same column (row), it may be removed.
 *
 * If the removed cell and the candidate partner also form a conjugate pair,
 * the first candidate on the row (column) may also be removed.
 *
 * Example: This shows a singles chain of 7 linking cells (58, 52, 61, 81).
 *
 *     123456789
 *   1 ·········
 *   2 ·········
 *   3 ·········
 *   4 ···7·7·7·  ←-- block 5 holds the Empty Rectangle for row 4 and column 4
 *   5 ···7·····      and cells 48 and 88 form the candidate pair
 *   6 ·········
 *   7 ·········
 *   8 ·7·7···7·  ←-- remove 7 from cell 48
 *   9 ····7····
 *
 * Regular:
 * "724956138 168423597 935718624 5..3..81. .4..8175. .81.7.24. .13....72 ...1...85 .5...7.61"
 *
 * Dual:
 * "58.179..3 ...6.8975 69735.... 9..53.728 7.381.5.. 85.9.713. 469281357 ..8765... .75493..."
 */
export default function solveEmptyRectangles(state: ReadableState): Move[] {
  const moves: Move[] = [];

  // for each known
  for (const k of ALL_KNOWNS) {
    LOG && console.info("[empty-rectangle] START", k);

    for (const [_, block] of BOARD.blocks) {
      const cells = state.getCandidateCells(block, k);
      const count = cells.size;
      if (count < 3) {
        // ignore degenerate singles chain
        continue;
      }

      const cellRows = new Map<Row, Set<Cell>>();
      const cellColumns = new Map<Column, Set<Cell>>();

      // group cells by row and column
      for (const c of cells) {
        if (cellRows.has(c.row)) {
          cellRows.get(c.row)!.add(c);
        } else {
          cellRows.set(c.row, new Set([c]));
        }
        if (cellColumns.has(c.column)) {
          cellColumns.get(c.column)!.add(c);
        } else {
          cellColumns.set(c.column, new Set([c]));
        }
      }

      if (cellRows.size === 1 || cellColumns.size === 1) {
        // pointing pair/triple
        continue;
      }

      // find one row and one column that together contain all cells
      let row, column;
      findRectangle: for (const [r, rc] of cellRows) {
        for (const [c, cc] of cellColumns) {
          if (rc.size + cc.size - intersect(rc, cc).size === count) {
            row = r;
            column = c;
            break findRectangle;
          }
        }
      }

      if (!row || !column) {
        continue;
      }

      LOG &&
        console.info(
          "[empty-rectangle] CHECK",
          block.name,
          Cell.stringFromPoints(cells)
        );

      const checked = new Set<Cell>();

      // look for conjugate pairs
      for (const [isRow, from, to] of [
        [true, row, column],
        [false, column, row],
      ] as [boolean, Group, Group][]) {
        const starts = difference(state.getCandidateCells(from, k), cells);

        for (const start of starts) {
          if (checked.has(start)) {
            continue;
          }

          const pair = state.getCandidateCells(
            isRow ? start.column : start.row,
            k
          );
          if (pair.size !== 2) {
            continue;
          }

          const [first, second] = pair;
          const end = first === start ? second : first;
          if (!end) {
            // just in case
            continue;
          }
          if (cellRows.has(end.row) || cellColumns.has(end.column)) {
            // cannot remove candidate from block
            continue;
          }

          LOG &&
            console.info(
              "[empty-rectangle] CONJUGATE",
              start.point.k,
              end.point.k
            );

          const candidates = state.getCandidateCells(
            isRow ? end.row : end.column,
            k
          );
          const candidate = intersect(
            candidates,
            state.getCandidateCells(to, k)
          );
          if (candidate.size !== 1) {
            continue;
          }

          const remove = singleSetValue(candidate);
          const double = candidates.size === 2;
          checked.add(remove);

          const move = new Move(Strategy.EmptyRectangle)
            .group(block)
            .clue(cells, k, "blue")
            .clue(end, k)
            .mark(remove, k);

          if (double) {
            LOG &&
              console.info(
                "[empty-rectangle] DOUBLE",
                start.point.k,
                remove.point.k
              );
            move.mark(start, k);
          } else {
            LOG && console.info("[empty-rectangle] SINGLE", remove.point.k);
            move.clue(start, k);
          }

          moves.push(move);
        }
      }
    }
  }

  return moves;
}
