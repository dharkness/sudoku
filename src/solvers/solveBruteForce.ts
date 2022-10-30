import { Known, stringFromKnownSet, UNKNOWN } from "../models/basics";
import { ReadableBoard, SimpleBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Move, Strategy } from "../models/solutions";

import { difference, singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveBruteForce(board: ReadableBoard): Move[] {
  const moves: Move[] = [];
  const unsolved = Array.from(GRID.cells.values())
    .filter((cell) => board.getValue(cell) === UNKNOWN)
    .sort((a, b) => a.point.k.localeCompare(b.point.k));

  if (unsolved.length) {
    const cells = new Set(unsolved);

    LOG &&
      console.info("SOLVE BRUTE FORCE attempt", Cell.stringFromPoints(cells));

    solveNextStep(
      new SimpleBoard(board as SimpleBoard),
      moves,
      new Move(Strategy.BruteForce),
      cells
    );
  }

  return moves;
}

function solveNextStep(
  board: SimpleBoard,
  moves: Move[],
  move: Move,
  cells: Set<Cell>
) {
  // move and board have been cloned already
  LOG &&
    console.info(
      "SOLVE BRUTE FORCE step",
      move.sets,
      Cell.stringFromPoints(cells)
    );

  const remaining = solveAllSingletons(board, move, cells);
  if (!remaining) {
    LOG && console.info("SOLVE BRUTE FORCE rewind");
    return;
  }

  if (!remaining.size) {
    LOG && console.info("SOLVE BRUTE FORCE solved");
    moves.push(move);
    return;
  }

  solveNextUnknown(board, moves, move, remaining);
}

function solveAllSingletons(
  board: SimpleBoard,
  move: Move,
  cells: Set<Cell>
): Set<Cell> | null {
  let singletons;
  let remaining = cells;

  while ((singletons = collectSingletons(board, remaining)).size) {
    LOG &&
      console.info(
        "SOLVE BRUTE FORCE singletons",
        Cell.stringFromPoints(new Set(singletons.keys()))
      );

    for (const [cell, known] of singletons) {
      if (!board.isCandidate(cell, known)) {
        return null;
      }

      LOG && console.info("SOLVE BRUTE FORCE set", cell.point.k, "=>", known);

      move.set(cell, known);
      board.setKnown(cell, known);

      if (!applyMarksAndSets(board, move)) {
        return null;
      }
    }

    remaining = difference(remaining, new Set(singletons.keys()));
  }

  return remaining;
}

function collectSingletons(
  board: SimpleBoard,
  cells: Set<Cell>
): Map<Cell, Known> {
  const singletons = new Map<Cell, Known>();

  for (const cell of cells) {
    if (board.getValue(cell) === UNKNOWN) {
      const candidates = board.getCandidates(cell);

      if (candidates.size === 1) {
        singletons.set(cell, singleSetValue(candidates));
      }
    }
  }

  return singletons;
}

function solveNextUnknown(
  board: SimpleBoard,
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
        new SimpleBoard(board),
        cell.point.k,
        new Move(move),
        cells
      );
    return;
  }

  const candidates = board.getCandidates(cell);
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
    const tryState = new SimpleBoard(board);
    const tryMove = new Move(move);

    LOG && console.info("SOLVE BRUTE FORCE", cell.point.k, "try", k);

    tryMove.set(cell, k);
    tryState.setKnown(cell, k);

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
  const rest = Array.from(cells);

  if (!rest.length) {
    throw new Error("Cannot call next() on empty set");
  }

  return [rest[0]!, new Set(rest.slice(1))];
}

function applyMarksAndSets(board: SimpleBoard, move: Move): boolean {
  let ok = true;
  let solved;

  while (ok && !(solved = board.getSolved()).isEmpty()) {
    board.clearSolved();

    // apply automatic marks
    solved.forEachErasedPencil((cell: Cell, known: Known) => {
      if (board.getValue(cell) === UNKNOWN && board.isCandidate(cell, known)) {
        board.removeCandidate(cell, known);
      }
    });

    // apply valid automatic sets
    // solved.forEachSolvedKnown((cell: Cell, known: Known) => {
    //   if (!ok) {
    //     return;
    //   }
    //
    //   const value = BOARD.getValue(board, cell);
    //   if (value === UNKNOWN) {
    //     if (BOARD.isCandidate(board, cell, known)) {
    //       move.set(cell, known);
    //       BOARD.setKnown(board, cell, known);
    //     } else {
    //       ok = false;
    //     }
    //   } else if (value !== known) {
    //     ok = false;
    //   }
    // });
  }

  board.clearSolved();

  return ok;
}

function areRemainingCellsValid(board: SimpleBoard, rest: Set<Cell>): boolean {
  for (const c of rest) {
    if (board.getValue(c) === UNKNOWN && !board.getCandidates(c).size) {
      return false;
    }
  }

  return true;
}
