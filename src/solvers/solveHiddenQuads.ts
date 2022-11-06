import { ReadableBoard } from "../models/board";
import { Move, Strategy } from "../models/move";

import { distinctQuads } from "../utils/collections";

import solveAbstractHiddenTuples from "./solveAbstractHiddenTuples";

/**
 * Looks for hidden triples to determine pencil marks to remove.
 * Removes other knowns from found cells.
 *
 * Example: This shows a hidden triple of (1, 7) in cells (2, 6).
 *
 *     ↓  ↓ ↓
 *     123456789  ←-- cell group index
 *   1 ·········    | cell candidates
 *   2 ···2·2222    |
 *   3 ·········    ↓
 * → 4 ···4·4···
 * → 5 5··5·5···
 *   6 6··6·6666
 *   7 ·····7·77
 *   8 ·········
 * → 9 9··9·9···
 *     ↑  ↑ ↑
 *     |  | remove 2, 6 and 7 from cell 6
 *     |  remove 2 and 6 from cell 4
 *     remove 6 from cell 1
 *
 * "65..87.24 ...649.5. .4..25... 57.438.61 ...5.1... 31.9.2.85 ...89..1. ...213... 13.75..98"
 * "9.15...46 425.9..81 86..1..2. 5.2...... .19...46. 6.......2 196.4.253 2...6.817 .....1694"
 */
export default function solveHiddenQuads(board: ReadableBoard): Move[] {
  return solveAbstractHiddenTuples(
    "hidden quad",
    Strategy.HiddenQuad,
    [2, 3, 4],
    distinctQuads,
    board
  );
}
