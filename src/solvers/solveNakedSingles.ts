import { BOARD } from "../models/board";
import { Move, Strategy } from "../models/solutions";
import { ReadableState } from "../models/state";

import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveNakedSingles(state: ReadableState): Move[] {
  const moves: Move[] = [];

  for (const [_, cell] of BOARD.cells) {
    const candidates = BOARD.getCandidates(state, cell);

    if (candidates.size === 1) {
      const candidate = singleSetValue(candidates);

      moves.push(
        new Move(Strategy.NakedSingle)
          .clue(cell, candidate)
          .set(cell, candidate)
      );

      LOG && console.info("SOLVE NAKED SINGLE", cell.point.k, "=>", candidate);
    }
  }

  return moves;
}
