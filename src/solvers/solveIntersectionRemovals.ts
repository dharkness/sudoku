import { BOARD, Cell, Intersection } from "../models/board";
import { Move, Strategy } from "../models/solutions";
import { ReadableState } from "../models/state";

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
 *   1 ·········
 *   2 ···777···  ←-- cells in box 5 (45 55) point to cell (25)
 *   3 ·········
 *   4 ····7····
 *   5 ····7····
 *   6 ·········
 *   7 ·77······  ←-- cells in line (74-79) being empty
 *   8 ······77·
 *   9 7·7··7···  ←-- ... clear box cells (91 93)
 */
export default function solveIntersectionRemovals(
  state: ReadableState
): Move[] {
  const moves: Move[] = [];

  function check(intersection: Intersection, pointing: boolean) {
    const from = pointing
      ? intersection.blockDisjoint
      : intersection.groupDisjoint;
    const to = pointing
      ? intersection.groupDisjoint
      : intersection.blockDisjoint;

    const candidates = withoutEmptySets(
      state.getCandidateCellsByKnown(intersection.intersection)
    );
    const keep = withoutEmptySets(state.getCandidateCellsByKnown(from));
    const remaining = withoutEmptySets(state.getCandidateCellsByKnown(to));

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

      moves.push(
        new Move(
          pointing
            ? count === 2
              ? Strategy.PointingPair
              : Strategy.PointingTriple
            : Strategy.BoxLineReduction
        )
          .group(intersection.block)
          .group(intersection.group)
          .clue(blockCells, k)
          .mark(cells, k)
      );

      LOG &&
        console.info(
          "SOLVE",
          pointing
            ? count === 2
              ? "POINTING PAIR"
              : "POINTING TRIPLE"
            : "BOX LINE REDUCTION",
          Cell.stringFromPoints(blockCells),
          k,
          "x",
          Cell.stringFromPoints(cells)
        );
    }
  }

  for (const intersection of BOARD.intersections) {
    check(intersection, true);
    check(intersection, false);
  }

  return moves;
}