import { ReadableBoard } from "../models/board";
import { Move, Strategy } from "../models/solutions";

import { distinctPairs } from "../utils/collections";

import solveAbstractFish from "./solveAbstractFish";

/**
 * Looks for X-Wings in rows and columns to determine pencil marks to remove.
 * Removes found known from other cells in opposite row/column.
 *
 * Example: This grid of cells having 4 as a candidate shows an X-Wing in rows 2 and 5
 *
 *        ↓   ↓
 *     123456789
 *   1 ·········
 *   2 ···4···4·
 *   3 ·········
 *   4 ·········
 * → 5 ···4···4·
 * → 6 ·········
 *   7 ···4·····  ←-- remove 4 from cell 74
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * "1.....569 492.561.8 .561.924. ..964.8.1 .64.1.... 218.356.4 .4.5...16 9.5.614.2 621.....5"
 */
export default function solveXWings(board: ReadableBoard): Move[] {
  return solveAbstractFish(Strategy.XWing, "x-wing", [2], distinctPairs, board);
}
