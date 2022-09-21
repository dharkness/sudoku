import { Known, stringFromKnownSet, UNKNOWN } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { Move, Strategy } from "../models/solutions";
import { ReadableState, SimpleState } from "../models/state";
import { difference, singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveBruteForce(state: ReadableState): Move[] {
  const moves: Move[] = [];
  const unsolved = [...BOARD.cells.values()]
    .filter((cell) => BOARD.getValue(state, cell) === UNKNOWN)
    .sort((a, b) => a.point.k.localeCompare(b.point.k));

  if (unsolved.length) {
    const cells = new Set(unsolved);

    LOG &&
      console.info("SOLVE BRUTE FORCE attempt", Cell.stringFromPoints(cells));

    solveNextStep(
      new SimpleState(state as SimpleState),
      moves,
      new Move(Strategy.BruteForce),
      cells
    );
  }

  return moves;
}

function solveNextStep(
  state: SimpleState,
  moves: Move[],
  move: Move,
  cells: Set<Cell>
) {
  // move and state have been cloned already
  LOG &&
    console.info(
      "SOLVE BRUTE FORCE step",
      move.sets,
      Cell.stringFromPoints(cells)
    );

  const remaining = solveAllSingletons(state, move, cells);
  if (!remaining) {
    LOG && console.info("SOLVE BRUTE FORCE rewind");
    return;
  }

  if (!remaining.size) {
    LOG && console.info("SOLVE BRUTE FORCE solved");
    moves.push(move);
    return;
  }

  solveNextUnknown(state, moves, move, remaining);
}

function solveAllSingletons(
  state: SimpleState,
  move: Move,
  cells: Set<Cell>
): Set<Cell> | null {
  let singletons;
  let remaining = cells;

  while ((singletons = collectSingletons(state, remaining)).size) {
    LOG &&
      console.info(
        "SOLVE BRUTE FORCE singletons",
        Cell.stringFromPoints(new Set(singletons.keys()))
      );

    for (const [cell, known] of singletons) {
      if (!BOARD.isCandidate(state, cell, known)) {
        return null;
      }

      LOG && console.info("SOLVE BRUTE FORCE set", cell.point.k, "=>", known);

      move.set(cell, known);
      BOARD.setKnown(state, cell, known);

      if (!applyMarksAndSets(state, move)) {
        return null;
      }
    }

    remaining = difference(remaining, new Set(singletons.keys()));
  }

  return remaining;
}

function collectSingletons(
  state: SimpleState,
  cells: Set<Cell>
): Map<Cell, Known> {
  const singletons = new Map<Cell, Known>();

  for (const cell of cells) {
    if (BOARD.getValue(state, cell) === UNKNOWN) {
      const candidates = BOARD.getCandidates(state, cell);

      if (candidates.size === 1) {
        singletons.set(cell, singleSetValue(candidates));
      }
    }
  }

  return singletons;
}

function solveNextUnknown(
  state: SimpleState,
  moves: Move[],
  move: Move,
  cells: Set<Cell>
) {
  const [cell, remaining] = next(cells);
  if (!remaining.size) {
    // failure: one cell left with multiple candidates
    LOG &&
      console.info(
        "SOLVE BRUTE FORCE error",
        new SimpleState(state),
        cell.point.k,
        new Move(move),
        cells
      );
    return;
  }

  const candidates = BOARD.getCandidates(state, cell);
  if (!candidates.size) {
    LOG && console.info("SOLVE BRUTE FORCE rewind");
    return;
  }

  LOG &&
    console.info(
      "SOLVE BRUTE FORCE",
      cell.point.k,
      "try",
      stringFromKnownSet(candidates)
    );

  for (const k of candidates) {
    const tryState = new SimpleState(state);
    const tryMove = new Move(move);

    LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "try", k);

    tryMove.set(cell, k);
    BOARD.setKnown(tryState, cell, k);

    if (
      applyMarksAndSets(tryState, tryMove) &&
      areRemainingCellsValid(tryState, remaining)
    ) {
      solveNextStep(tryState, moves, tryMove, remaining);
    } else {
      LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "not", k);
    }
  }
}

function next(cells: Set<Cell>): [Cell, Set<Cell>] {
  const rest = [...cells];

  if (!rest.length) {
    throw new Error("Cannot call next() on empty set");
  }

  return [rest[0]!, new Set(rest.slice(1))];
}

function applyMarksAndSets(state: SimpleState, move: Move): boolean {
  let ok = true;
  let solved;

  while (ok && !(solved = state.getSolved()).isEmpty()) {
    state.clearSolved();

    // apply automatic marks
    solved.forEachErasedPencil((cell: Cell, known: Known) => {
      if (
        BOARD.getValue(state, cell) === UNKNOWN &&
        BOARD.isCandidate(state, cell, known)
      ) {
        BOARD.removeCandidate(state, cell, known);
      }
    });

    // apply valid automatic sets
    // solved.forEachSolvedKnown((cell: Cell, known: Known) => {
    //   if (!ok) {
    //     return;
    //   }
    //
    //   const value = BOARD.getValue(state, cell);
    //   if (value === UNKNOWN) {
    //     if (BOARD.isCandidate(state, cell, known)) {
    //       move.set(cell, known);
    //       BOARD.setKnown(state, cell, known);
    //     } else {
    //       ok = false;
    //     }
    //   } else if (value !== known) {
    //     ok = false;
    //   }
    // });
  }

  state.clearSolved();

  return ok;
}

function areRemainingCellsValid(state: SimpleState, rest: Set<Cell>): boolean {
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
