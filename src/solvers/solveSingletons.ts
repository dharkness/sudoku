import { BOARD } from "../models/board";
import { Solutions } from "../models/solutions";
import { ReadableState } from "../models/state";

import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single possible value to solve.
 */
export default function solveSingletons(
  state: ReadableState,
  solutions: Solutions
): void {
  for (const [_, cell] of BOARD.cells) {
    const possibles = BOARD.getPossibles(state, cell);

    if (possibles.size === 1) {
      const solution = singleSetValue(possibles);

      LOG && console.info("SOLVE SINGLETON", cell.point.k, "=>", solution);

      solutions.addSolvedKnown(cell, solution);
    }
  }
}
