import { Known, stringFromKnownSet, UNKNOWN } from "../models/basics";
import { ReadableBoard, SimpleBoard } from "../models/board";
import { Cell, GRID } from "../models/grid";
import { Move, Moves, Strategy } from "../models/move";

import { distinctPairs } from "../utils/collections";

const LOG = false;

type Solution = { solved: Map<Cell, Known>; board: SimpleBoard };

/**
 * Looks for cells with a single candidate to solve.
 */
export default function solveBruteForce(board: ReadableBoard): Move[] {
  const moves: Move[] = [];
  const unsolved = Array.from(GRID.cells.values())
    .filter((cell) => board.getValue(cell) === UNKNOWN)
    .sort((a, b) => a.compare(b));

  if (unsolved.length) {
    const cells = new Set(unsolved);
    const solutions = new Set<Solution>();

    LOG && console.info("[brute-force] start", Cell.stringFromPoints(cells));

    solveNextStep(
      new SimpleBoard(board as SimpleBoard),
      solutions,
      new Map(),
      cells
    );

    distinctPairs(solutions).forEach(([first, second]) => {
      const rectangles = findPossibleDeadlyRectangles(
        first.board,
        second.board
      );

      if (rectangles) {
        LOG &&
          console.info(
            "[brute-force] deadly rectangle",
            rectangles,
            first,
            second
          );

        solutions.delete(first);
        solutions.delete(second);
      }
    });

    for (const solution of solutions) {
      LOG && console.info("[brute-force] found", solution.solved);

      moves.push(
        new Move(Strategy.BruteForce, null, null, solution.solved, null)
      );
    }
  }

  return moves;
}

function findPossibleDeadlyRectangles(
  first: SimpleBoard,
  second: SimpleBoard
): Map<Cell, Set<Known>> | false {
  const dupes = new Map<Cell, Set<Known>>();

  for (const cell of GRID.cells.values()) {
    const k1 = first.getValue(cell);
    const k2 = second.getValue(cell);

    if (k1 === UNKNOWN || k2 === UNKNOWN) {
      return false;
    }

    if (k1 !== k2) {
      dupes.set(cell, new Set([k1, k2]));
    }
  }

  return dupes.size > 0 && dupes.size % 4 === 0 ? dupes : false;
}

function solveNextStep(
  board: SimpleBoard,
  solutions: Set<Solution>,
  solved: Map<Cell, Known>,
  cells: Set<Cell>
) {
  // board and solved have been cloned already

  LOG &&
    console.info("[brute-force] step", solved, Cell.stringFromPoints(cells));

  const [cell, remaining] = next(cells);

  const candidates = board.getCandidates(cell);
  if (!candidates.size) {
    LOG &&
      console.error(
        "[brute-force] failed",
        cell.toString(),
        stringFromKnownSet(candidates)
      );

    return;
  }

  LOG &&
    console.info(
      "[brute-force] next",
      cell.toString(),
      "∴",
      stringFromKnownSet(candidates)
    );

  for (const k of candidates) {
    const tryBoard = new SimpleBoard(board);
    const trySolved = new Map(solved);

    LOG && console.info("[brute-force] guess", cell.toString(), "⇨", k);

    if (!setKnownAndApplyAllMoves(tryBoard, trySolved, cell, k)) {
      LOG && console.info("[brute-force] fail", cell.toString(), "≠", k);

      continue;
    }

    const tryRemaining = collectRemaining(tryBoard, remaining);
    if (!tryRemaining.size) {
      LOG && console.info("[brute-force] possible", trySolved, board);

      solutions.add({ solved: trySolved, board });

      continue;
    }

    if (areRemainingCellsValid(tryBoard, tryRemaining)) {
      solveNextStep(tryBoard, solutions, trySolved, tryRemaining);
    } else {
      LOG && console.info("[brute-force] fail", cell.toString(), "≠", k);
    }
  }

  LOG && console.info("[brute-force] rewind", cell.toString());
}

function collectRemaining(board: SimpleBoard, cells: Set<Cell>): Set<Cell> {
  const remaining = new Set<Cell>();

  for (const cell of cells) {
    if (!board.isSolved(cell)) {
      remaining.add(cell);
    }
  }

  return remaining;
}

function next(cells: Set<Cell>): [Cell, Set<Cell>] {
  if (!cells.size) {
    throw new Error("Cannot call next() on empty set");
  }

  const [next, ...rest] = Array.from(cells);
  return [next!, new Set(rest)];
}

function setKnownAndApplyAllMoves(
  board: SimpleBoard,
  solved: Map<Cell, Known>,
  cell: Cell,
  known: Known
): boolean {
  let moves = new Moves();

  moves.add(Strategy.Solve).set(cell, known);

  while (moves.size()) {
    for (const move of moves) {
      for (const [cell, known] of move.sets) {
        solved.set(cell, known);
      }
    }

    moves = moves.apply(board);
  }

  return board.collectErrors().size === 0;
}

function areRemainingCellsValid(board: SimpleBoard, rest: Set<Cell>): boolean {
  for (const c of rest) {
    if (!(board.isSolved(c) || board.getCandidates(c).size)) {
      return false;
    }
  }

  return true;
}
