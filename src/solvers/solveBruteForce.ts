import { BOARD, Cell } from "../models/board";
import { Solutions } from "../models/solutions";
import { ReadableState, SimpleState } from "../models/state";

import { Known, UNKNOWN } from "../models/basics";

const LOG = false;

/**
 * Looks for cells with a single possible value to solve.
 */
export default function solveBruteForce(
  state: ReadableState,
  solutions: Solutions
): void {
  const cells = [...BOARD.cells.values()]
    .filter((cell) => BOARD.getValue(state, cell) === UNKNOWN)
    .sort((a, b) => a.point.k.localeCompare(b.point.k));

  if (cells.length) {
    step(state as SimpleState, cells, solutions);
  }
}

function step(
  state: SimpleState,
  cells: Cell[],
  solutions: Solutions
): boolean {
  const cell = cells[0]!;
  const rest = cells.slice(1);
  const value = BOARD.getValue(state, cell);

  if (value === UNKNOWN) {
    const possibles = BOARD.getPossibles(state, cell);

    if (!possibles.size || (!rest.length && possibles.size > 1)) {
      return false;
    }

    for (const k of possibles) {
      const clone = new SimpleState(state);

      LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "try", k);

      BOARD.setKnown(clone, cell, k);

      let solved;
      let error;
      while (!error && !(solved = clone.getSolved()).isEmpty()) {
        clone.clearSolved();
        solved.forEachErasedPencil((cell: Cell, known: Known) => {
          if (
            BOARD.getValue(clone, cell) === UNKNOWN &&
            BOARD.isPossible(clone, cell, known)
          ) {
            BOARD.removePossible(clone, cell, known);
          }
        });
        solved.forEachSolvedKnown((cell: Cell, known: Known) => {
          if (BOARD.getValue(clone, cell) === UNKNOWN) {
            if (BOARD.isPossible(clone, cell, known)) {
              BOARD.setKnown(clone, cell, known);
            } else {
              error = true;
            }
          }
        });
      }
      clone.clearSolved();

      if (error) {
        LOG && console.info("SOLVE BRUTE FORCE error");

        continue;
      }

      if (!rest.length) {
        solutions.addSolvedKnown(cell, k);

        LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "=>", k);

        return true;
      }

      if (areRemainingCellsValid(clone, rest)) {
        if (step(clone, rest, solutions)) {
          solutions.addSolvedKnown(cell, k);

          LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "=>", k);

          return true;
        }
      }

      LOG && console.info("SOLVE BRUTE FORCE rewind");
    }
  } else if (!rest.length || step(state, rest, solutions)) {
    solutions.addSolvedKnown(cell, value);

    LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "=>", value);

    return true;
  }

  return false;
}

function areRemainingCellsValid(state: SimpleState, rest: Cell[]): boolean {
  for (const c of rest) {
    if (
      BOARD.getValue(state, c) === UNKNOWN &&
      !BOARD.getPossibles(state, c).size
    ) {
      return false;
    }
  }

  return true;
}
