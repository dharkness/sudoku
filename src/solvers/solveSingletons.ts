import { BOARD } from "../models/board";
import { Solutions } from "../models/solutions";
import { ReadableState } from "../models/state";

import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveSingletons(
  state: ReadableState,
  solutions: Solutions
): void {
  for (const [_, cell] of BOARD.cells) {
    const candidates = BOARD.getCandidates(state, cell);

    if (candidates.size === 1) {
      const solution = singleSetValue(candidates);

      LOG && console.info("SOLVE SINGLETON", cell.point.k, "=>", solution);

      solutions.addSolvedKnown(cell, solution);
    }
  }
}
