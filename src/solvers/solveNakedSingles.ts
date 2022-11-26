import { cellsWithNCandidates, ReadableBoard } from "../models/board";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";
import { SOLVE_CELL } from "../models/symbols";

import { singleValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveNakedSingles(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();

  for (const [cell, candidates] of cellsWithNCandidates(board, 1)) {
    const candidate = singleValue(candidates);

    moves
      .start(Strategy.NakedSingle)
      .clue(cell, candidate)
      .set(cell, candidate);

    LOG &&
      console.info("[naked-single] FOUND", cell.key, SOLVE_CELL, candidate);
  }

  return moves;
}
