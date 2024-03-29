import { ReadableBoard } from "../models/board";
import { GRID, Cell, Intersection } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";
import { REMOVE_MARK } from "../models/symbols";

import { difference, intersect, withoutEmptySets } from "../utils/collections";

const LOG = false;

/**
 * Looks for a candidate remaining in two or three cells in a block
 * that all lie in one row or column.
 *
 * - When the candidate is removed from the column/row disjoint,
 *   the candidate cells in the block are called a Pointing Pair/Triple.
 * - When the candidate is removed from the block disjoint, it is called
 *   a Box Line Reduction.
 *
 * Example: This shows one Pointing Pair and one Box Line Reduction.
 *
 *     123456789
 *   A ·········
 *   B ···777···  ←-- cells in box 5 (D5 E5) point to cell (B5)
 *   C ·········
 *   D ····7····
 *   E ····7····
 *   F ·········
 *   G ·77······  ←-- cells in line (G4...G9) being empty
 *   H ······77·
 *   J 7·7··7···  ←-- ... clear box 7 cells (J1 J3)
 *
 * "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68.."
 */
export default function solveIntersectionRemovals(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();

  function check(intersection: Intersection, pointing: boolean) {
    const from = pointing
      ? intersection.blockDisjoint
      : intersection.groupDisjoint;
    const to = pointing
      ? intersection.groupDisjoint
      : intersection.blockDisjoint;

    const candidates = withoutEmptySets(
      board.getCandidateCellsByKnown(intersection.intersection)
    );
    const keep = withoutEmptySets(board.getCandidateCellsByKnown(from));
    const remaining = withoutEmptySets(board.getCandidateCellsByKnown(to));

    const remove = intersect(
      difference(new Set(candidates.keys()), new Set(keep.keys())),
      new Set(remaining.keys())
    );

    for (const k of remove) {
      const blockCells = candidates.get(k);
      if (!blockCells?.size) {
        continue;
      }

      const count = blockCells.size;
      if (![2, 3].includes(count)) {
        // single candidate cell is a hidden single
        continue;
      }

      const cells = remaining.get(k);
      if (!cells?.size) {
        // not possible
        continue;
      }

      moves
        .start(
          pointing
            ? count === 2
              ? Strategy.PointingPair
              : Strategy.PointingTriple
            : Strategy.BoxLineReduction
        )
        .group(intersection.block)
        .group(intersection.group)
        .clue(blockCells, k, pointing ? "green" : "blue")
        .mark(cells, k);

      LOG &&
        console.info(
          pointing
            ? count === 2
              ? "[pointing-pair] FOUND"
              : "[pointing-triple] FOUND"
            : "[box-line-reduction] FOUND",
          Cell.stringFromPoints(blockCells),
          k,
          REMOVE_MARK,
          Cell.stringFromPoints(cells)
        );
    }
  }

  for (const intersection of GRID.intersections) {
    check(intersection, true);
    check(intersection, false);
  }

  return moves;
}
