import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctTriples } from "../utils/collections";

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
 * "294513..6 6..842319 3..697254 ....56... .4..8..6. ...47.... 73.164..5 9..735..1 4..928637"
 */
export default function solveNakedTriples(board: ReadableBoard): Moves {
  return solveAbstractNakedTuples(
    "naked triple",
    Strategy.NakedTriple,
    [2, 3],
    distinctTriples,
    board
  );
}
