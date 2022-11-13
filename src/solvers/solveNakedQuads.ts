import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctQuads } from "../utils/collections";

import solveAbstractNakedTuples from "./solveAbstractNakedTuples";

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
 *
 * "....3..86 ....2..4. .9..7852. 371856294 9..142375 4..397618 2..7.3859 .392.5467 7..9.4132"
 */
export default function solveNakedQuads(board: ReadableBoard): Moves {
  return solveAbstractNakedTuples(
    "naked triple",
    Strategy.NakedQuad,
    [2, 3, 4],
    distinctQuads,
    board
  );
}
