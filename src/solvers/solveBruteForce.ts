import { Known, UNKNOWN } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { Move, Solutions, Strategy } from "../models/solutions";
import { ReadableState, SimpleState } from "../models/state";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveBruteForce(state: ReadableState): Move[] {
  const cells = [...BOARD.cells.values()]
    .filter((cell) => BOARD.getValue(state, cell) === UNKNOWN)
    .sort((a, b) => a.point.k.localeCompare(b.point.k));
  if (!cells.length) {
    return [];
  }

  const solutions = new Solutions();
  step(state as SimpleState, cells, solutions);
  if (solutions.isEmpty()) {
    return [];
  }

  const move = new Move(Strategy.BruteForce);
  solutions.forEachSolvedKnown((cell: Cell, known: Known) =>
    move.set(cell, known)
  );

  return [move];
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
    const candidates = BOARD.getCandidates(state, cell);

    if (!candidates.size || (!rest.length && candidates.size > 1)) {
      return false;
    }

    for (const k of candidates) {
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
            BOARD.isCandidate(clone, cell, known)
          ) {
            BOARD.removeCandidate(clone, cell, known);
          }
        });
        solved.forEachSolvedKnown((cell: Cell, known: Known) => {
          if (BOARD.getValue(clone, cell) === UNKNOWN) {
            if (BOARD.isCandidate(clone, cell, known)) {
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
      !BOARD.getCandidates(state, c).size
    ) {
      return false;
    }
  }

  return true;
}
