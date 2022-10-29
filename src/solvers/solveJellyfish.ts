import { ReadableBoard } from "../models/board";
import { Move, Strategy } from "../models/solutions";

import { distinctQuads } from "../utils/collections";

import solveAbstractFish from "./solveAbstractFish";

/**
 * Looks for four rows/columns with two to four candidate cells for a known
 * that all lie on the same four cross columns/rows.
 *
 * The known can be removed from other cells in the same columns/rows.
 *
 * Example: This grid of cells having 4 as a candidate shows a Jellyfish in rows 2, 3, 5 and 7
 *
 *      ↓ ↓↓  ↓
 *     123456789
 *   1 ·········
 * → 2 ···44··4·
 * → 3 ·4··4····
 *   4 ···44····  ←-- remove 4 from cells 44 and 45
 * → 5 ·4·4···4·
 *   6 ·········
 * → 7 ·4·44····
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * 3x2x3x3 rows "..17538.. .5......7 7..89.1.. ...6.157. 625478931 .179.54.. ....67..4 .7.....1. ..63.97.."
 * 3x4x2x2 rows "......... .7..3.92. .19.2563. ..4...21. ......... .57.9.46. .9514.37. ......... .4236759."
 * 4x4x4x4 rows ".5.749.8. .89..3... 6....139. .4...7.6. ...4..8.9 ......... .6...4.1. 5..21..47 .1...5.3."
 */
export default function solveJellyfish(board: ReadableBoard): Move[] {
  return solveAbstractFish(
    Strategy.Jellyfish,
    "jellyfish",
    [2, 3, 4],
    distinctQuads,
    board
  );
}
