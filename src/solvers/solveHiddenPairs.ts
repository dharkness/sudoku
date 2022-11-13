import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctPairs } from "../utils/collections";

import solveAbstractHiddenTuples from "./solveAbstractHiddenTuples";

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
 *
 * "9........ 3...6..2. ..5...7.3 .31.84... 82..1.549 .4....8.. 75.1.6.8. 4..8..1.. ...7....."
 */
export default function solveHiddenPairs(board: ReadableBoard): Moves {
  return solveAbstractHiddenTuples(
    "hidden pair",
    Strategy.HiddenPair,
    [2],
    distinctPairs,
    board
  );
}
