import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctTriples } from "../utils/collections";

import solveAbstractHiddenTuples from "./solveAbstractHiddenTuples";

/**
 * Looks for hidden triples to determine pencil marks to remove.
 * Removes other knowns from found cells.
 *
 * Example: This shows a hidden triple of (4, 5, 9) in cells (1, 4, 6).
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
 */
export default function solveHiddenTriples(board: ReadableBoard): Moves {
  return solveAbstractHiddenTuples(
    "hidden triple",
    Strategy.HiddenTriple,
    [2, 3],
    distinctTriples,
    board
  );
}
