import { ReadableBoard } from "../models/board";
import { GRID } from "../models/grid";
import { Move } from "../models/move";
import { Strategy } from "../models/strategy";

import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveNakedSingles(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const [_, cell] of GRID.cells) {
    const candidates = board.getCandidates(cell);

    if (candidates.size === 1) {
      const candidate = singleSetValue(candidates);

      moves.push(
        Move.start(Strategy.NakedSingle)
          .clue(cell, candidate)
          .set(cell, candidate)
      );

      LOG && console.info("SOLVE NAKED SINGLE", cell.key, "=>", candidate);
    }
  }

  return moves;
}
