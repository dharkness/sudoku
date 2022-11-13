import { ReadableBoard } from "../models/board";
import { Move, Strategy } from "../models/move";

import { distinctTriples } from "../utils/collections";

import solveAbstractFish from "./solveAbstractFish";

/**
 * Looks for three rows/columns with two or three candidate cells for a known
 * that all lie on the same three cross columns/rows.
 *
 * The known can be removed from other cells in the same columns/rows.
 *
 * Example: This grid of cells having 4 as a candidate shows a Swordfish in rows 2, 5 and 7
 *
 *      ↓ ↓   ↓
 *     123456789
 *   A ·········
 * → B ···4···4·
 *   C ·4·······  ←-- remove 4 from cell C2
 *   D ·········
 * → E ·4·4···4·
 *   F ·········
 * → G ·4·4·····
 *   H ·······4·  ←-- remove 4 from cell H8
 *   J ·········
 *
 * 3x3x3 columns "52941.7.3 ..6..3..2 ..32..... .523...76 637.5.2.. 19.62753. 3...6942. 2..83.6.. 96.7423.5"
 * 2x2x2 columns "926...1.. 537.1.42. 841...6.3 259734816 714.6..3. 36812..4. 1.2....84 485.7136. 6.3.....1"
 * 3x2x3 rows    ".2..43.69 ..38962.. 96..25.3. 89.56..13 6...3.... .3..81.26 3...1..7. ..96743.2 27.358.9."
 */
export default function solveSwordfish(board: ReadableBoard): Move[] {
  return solveAbstractFish(
    Strategy.Swordfish,
    "swordfish",
    [2, 3],
    distinctTriples,
    board
  );
}
