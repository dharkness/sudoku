import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { distinctPairs } from "../utils/collections";

import solveAbstractFish from "./solveAbstractFish";

/**
 * Looks for X-Wings in rows and columns to determine pencil marks to remove.
 * Removes found known from other cells in opposite row/column.
 *
 * Example: This grid of cells having 4 as a candidate shows an X-Wing in rows B and E
 *
 *        ↓   ↓
 *     123456789
 *   A ·········
 * → B ···4···4·
 *   C ·········
 *   D ·········
 * → E ···4···4·
 *   F ·········
 *   G ···4·····  ←-- remove 4 from cell G4
 *   H ·······4·  ←-- remove 4 from cell H8
 *   J ·········
 *
 * "1.....569 492.561.8 .561.924. ..964.8.1 .64.1.... 218.356.4 .4.5...16 9.5.614.2 621.....5"
 */
export default function solveXWings(board: ReadableBoard): Moves {
  return solveAbstractFish(Strategy.XWing, "x-wing", [2], distinctPairs, board);
}
