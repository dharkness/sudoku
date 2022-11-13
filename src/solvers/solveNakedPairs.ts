import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctPairs } from "../utils/collections";

import solveAbstractNakedTuples from "./solveAbstractNakedTuples";

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
 *
 * "9........ 3...6..2. ..5...7.3 .31.84... 82..1.549 .4....8.. 75.1.6.8. 4..8..1.. ...7....."
 */
export default function solveNakedPairs(board: ReadableBoard): Moves {
  return solveAbstractNakedTuples(
    "naked pair",
    Strategy.NakedPair,
    [2],
    distinctPairs,
    board
  );
}
