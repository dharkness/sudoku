#!/usr/bin/env ts-node

import { ALL_KNOWNS, Known } from "../src/models/basics";
import { SimpleBoard } from "../src/models/board";
import { shuffle } from "../src/utils/collections";
import { Cell, GRID } from "../src/models/grid";
import { Moves } from "../src/models/move";
import { printAllCandidates, printValues } from "../src/models/printers";
import { Strategy } from "../src/models/strategy";

import solvers from "../src/solvers/index";

// Works backwards from a solved puzzle to find a starting position that can be solved
// using a subset of solvers.
//
// TODO Simplify "can solve from X" to check all solvers for all cells regardless of order.
// TODO Write a new solver that starts from a pattern of solved cells without values and works forward.

const solverKeys = [
  "nakedSingles",
  "hiddenSingles",
  "intersectionRemovals",

  "nakedPairs",
  "nakedTriples",
  "nakedQuads",
  "hiddenPairs",
  "hiddenTriples",
  "hiddenQuads",

  "xWings",
  "singlesChains",
  "yWings",
  "swordfish",
  "skyscrapers",
  "xyzWings",

  "xyChains",
  "threeDMedusa",
  "jellyfish",
  "uniqueRectangles",

  "emptyRectangles",
];

generate();

function generate() {
  const start = Date.now();
  const [full, _] = SimpleBoard.createFrom(
    "379614258 248935176 156287934 827591463 914763825 563428791 685172349 791346582 432859617"
  );
  console.log("time", Date.now() - start);
  if (!full) {
    console.error("NO VALID BOARDS!");
  } else {
    const start = Date.now();
    generateBackwards(full);
    console.log("time", Date.now() - start);
  }
}

// generateBackwards(
//   "561839427 349271865 827564931 275683149 438195672 196427358 952316784 783942516 614758293"
// );

// generateForwards();

// generateFromPattern(
//   // "..6..942. 9......5. ......8.. ..3.7.5.. .6.54...8 ..28....7 .8.49...3 4..1..... 12..5..7."
//   ".5.78.... 9.823.756 27461..39 .4.9..... ...5.2.98 ..2..31.7 .....7.1. 43....9.5 1.93....."
// );

function generateFromPattern(pattern: string) {
  const cells = Moves.createFrom(pattern).moves.map(
    (move) => Array.from(move.sets.keys())[0]!
  );

  for (const board of boardsFromPatternStack(cells)) {
    const solution = canSolve(board);

    if (solution) {
      console.log("start", GRID.toString(board));
      console.log(solution);
      printValues(board, true);
      printAllCandidates(board, true, true);
    }
  }
}

function generateFullBoard(): SimpleBoard | null {
  let step = 0;
  let errors = 0;
  let candidates = 0;
  const start = Date.now();

  const cells = shuffle(Array.from(GRID.cells.values()));
  const stack = [] as Entry[];
  stack.push({
    board: SimpleBoard.createEmpty(),
    cell: cells[0]!,
    knowns: shuffle([...ALL_KNOWNS]),
  });

  while (stack.length) {
    // if (++step % 1000 === 0) {
    //   console.info(
    //     "step",
    //     step,
    //     "errors",
    //     errors,
    //     "candidates",
    //     candidates,
    //     "time",
    //     Date.now() - start
    //   );
    // }

    const { board, cell, knowns } = stack[stack.length - 1]!;

    if (!knowns.length) {
      // ran out of guesses, backtrack
      stack.pop();
      continue;
    }

    const known = knowns.pop()!;
    const clone = board.clone();
    const moves = Moves.createEmpty();

    clone.setKnown(cell, known, moves);
    if (clone.hasErrors()) {
      // invalid board, skip
      errors += 1;
      // console.error("has errors", cell.key, known, GRID.toString(clone));
      continue;
    }
    moves.applyAll(clone, [
      Strategy.Neighbor,
      Strategy.PointingPair,
      Strategy.PointingTriple,
      Strategy.BoxLineReduction,
    ]);

    if (stack.length === 81) {
      // found a valid board, done
      candidates += 1;
      // console.info("candidate ", cell.key, known, GRID.toString(clone));
      return clone;
    } else {
      // proceed to next cell
      const next = cells[stack.length]!;

      stack.push({
        board: clone,
        cell: next,
        knowns: shuffle(Array.from(clone.getCandidates(next))),
      });
    }
  }

  return null;
}

function* boardsFromPatternStack(cells: Cell[]): Generator<SimpleBoard> {
  const size = cells.length;

  let step = 0;
  let errors = 0;
  let candidates = 0;
  const start = Date.now();

  // const counters = new Array<number>(size).fill(0);
  // const boards = new Array<SimpleBoard>(size);

  const stack = [] as Entry[];
  stack.push({
    board: SimpleBoard.createEmpty(),
    cell: cells[0]!,
    knowns: shuffle([...ALL_KNOWNS]),
  });

  while (stack.length) {
    if (++step % 1000 === 0) {
      console.info(
        "step",
        step,
        "errors",
        errors,
        "candidates",
        candidates,
        "time",
        Date.now() - start
      );
    }

    const { board, cell, knowns } = stack[stack.length - 1]!;

    if (!knowns.length) {
      // ran out of guesses, backtrack
      stack.pop();
      continue;
    }

    const known = knowns.pop()!;
    // not necessary since knowns are the candidates
    // if (!board.isCandidate(cell, known)) {
    //   // not possible, skip
    //   console.error("cannot set", cell.key, known, GRID.toString(board));
    //   continue;
    // }

    const clone = board.clone();
    const moves = Moves.createEmpty();

    clone.setKnown(cell, known, moves);
    if (clone.hasErrors()) {
      // invalid board, skip
      errors += 1;
      // console.error("has errors", cell.key, known, GRID.toString(clone));
      continue;
    }
    moves.applyAll(clone, [
      Strategy.Neighbor,
      Strategy.PointingPair,
      Strategy.PointingTriple,
      Strategy.BoxLineReduction,
    ]);

    // okay, proceed to next cell or yield if none left
    if (stack.length === size) {
      // found a valid board, yield and skip
      candidates += 1;
      // console.info("candidate ", cell.key, known, GRID.toString(clone));
      yield clone;
    } else {
      // proceed to next cell
      const next = cells[stack.length]!;

      stack.push({
        board: clone,
        cell: next,
        knowns: Array.from(clone.getCandidates(next)),
      });
    }
  }
}

type Entry = {
  board: SimpleBoard;
  cell: Cell;
  knowns: Known[];
};

function* boardsFromPattern(cells: Cell[]): Generator<SimpleBoard> {
  const size = cells.length;
  const knowns = cells.reduce(
    (acc: Known[][], _) => [...acc, [...ALL_KNOWNS]],
    []
  );

  const counters = new Array<number>(size).fill(0);
  const boards = new Array<SimpleBoard>(size);
  let index = 0;

  while (true) {
    // set cells starting at the index to the end of the pattern; skip if move is not possible
    for (; index < size; index++) {
      const board =
        index === 0 ? SimpleBoard.createEmpty() : boards[index - 1]!.clone();
      const cell = cells[index]!;
      const counter = counters[index]!;
      const known = knowns[index]![counter]!;

      if (!board.isCandidate(cell, known)) {
        console.error("cannot set", cell.key, known, GRID.toString(board));
        break;
      }

      const moves = Moves.createEmpty();
      board.setKnown(cell, known, moves);
      moves.apply(board, Strategy.Neighbor);

      boards[index] = board;
    }

    if (index === size) {
      yield boards[size - 1]!;
      index -= 1;
    }

    // increment counter(s)
    while ((counters[index] += 1) === 9) {
      counters[index] = 0;
      index -= 1;
    }

    if (index === -1) {
      // all initial boards exhausted
      break;
    }
  }
}

function generateBackwards(board: SimpleBoard) {
  let start = board;
  let cell: Cell | null = null;

  do {
    // printAllCandidates(start, true, true);

    [start, cell] = removeOneSolvableCell(
      start,
      [
        "intersectionRemovals",
        "nakedPairs",
        "nakedTriples",
        "nakedQuads",
        "hiddenPairs",
        "hiddenTriples",
        "hiddenQuads",

        "xWings",
        "singlesChains",
        "yWings",
        "swordfish",
        "skyscrapers",
        "xyzWings",

        // "xyChains",
        // "threeDMedusa",
        // "jellyfish",
        // "uniqueRectangles",
        //
        // "emptyRectangles",
      ],
      ["nakedSingles", "hiddenSingles"]
    );
  } while (cell);

  console.log("start", GRID.toString(start));
  console.log("clues", start.solvedCount());
  console.log(canSolve(start));
  printValues(start, true);
  printAllCandidates(start, true, true);
}

function generateForwards() {
  let board = SimpleBoard.createEmpty();

  const cells = shuffle(
    Array.from(GRID.cells.values()).filter((c) => !board.isSolved(c))
  );

  done: for (const cell of cells) {
    if (board.isSolved(cell)) {
      continue;
    }

    const candidates = shuffle(Array.from(board.getCandidates(cell)));

    for (const k of candidates) {
      if (!board.isCandidate(cell, k)) {
        continue;
      }

      const moves = Moves.createEmpty();
      // const clone = board.clone();

      board.setKnown(cell, k, moves);
      moves.applyAll(board);

      if (
        canSolveWith(
          board,
          [
            "intersectionRemovals",
            "nakedPairs",
            "nakedTriples",
            "nakedQuads",
            "hiddenPairs",
            "hiddenTriples",
            "hiddenQuads",

            "xWings",
            "singlesChains",
            "yWings",
            "swordfish",
            "skyscrapers",
            "xyzWings",

            "xyChains",
            "threeDMedusa",
            "jellyfish",
            "uniqueRectangles",

            "emptyRectangles",
          ],
          ["nakedSingles", "hiddenSingles"]
        )
      ) {
        break done;
      }
    }
  }

  console.log("start", GRID.toString(board));
  printValues(board, true);
  printAllCandidates(board, true, true);
}

function removeOneSolvableCell(
  board: SimpleBoard,
  pencilKeys: string[],
  solverKeys: string[]
): [SimpleBoard, Cell | null] {
  const cells = shuffle(
    Array.from(GRID.cells.values()).filter((cell) => board.isSolved(cell))
  );

  for (const cell of cells) {
    // console.log("try", cell.toString());

    const without = withoutCell(board, cell);
    // if (canSolveCellWith(without, cell, pencilKeys, solverKeys, false)) {
    //   return [without, cell];
    // }
    // if (canSolveWith(without, pencilKeys, solverKeys)) {
    //   return [without, cell];
    // }
    if (canSolve(without)) {
      return [without, cell];
    }
  }

  return [board, null];
}

function withoutCell(board: SimpleBoard, cell: Cell): SimpleBoard {
  const without = SimpleBoard.createEmpty();
  const moves = Moves.createEmpty();

  for (const [_, c] of GRID.cells) {
    if (c !== cell && board.isSolved(c)) {
      without.setKnown(c, board.getValue(c)!, moves);
    }
  }

  moves.apply(without, Strategy.Neighbor);

  return without;
}

function canSolveCellWith(
  board: SimpleBoard,
  cell: Cell,
  pencilKeys: string[],
  solverKeys: string[],
  debug: boolean
): boolean {
  const clone = board.clone();

  if (debug) {
    console.log("start", GRID.toString(clone));
    printValues(clone, true);
    printAllCandidates(clone, true, true);
  }
  // printAllCandidates(clone, true, true);

  let done = false;
  do {
    done = true;

    for (const key of pencilKeys) {
      // console.log("pencil", key);

      const solve = solvers[key];
      const moves = solve!(clone);

      if (moves.size()) {
        if (debug) {
          console.log("moves", moves.toString());
        }

        moves.apply(clone);
        done = false;
      }
    }
  } while (!done);

  for (const key of solverKeys) {
    // console.log("solve", key);

    const solve = solvers[key];
    const moves = solve!(clone);

    if (debug) {
      console.log("moves", moves.toString());
    }

    if (moves.solves(cell)) {
      return true;
    }
  }

  return false;
}

function canSolveWith(
  board: SimpleBoard,
  pencilKeys: string[],
  solverKeys: string[]
): boolean {
  const clone = board.clone();

  let done = false;
  do {
    done = true;

    for (const key of pencilKeys) {
      const solve = solvers[key];
      const moves = solve!(clone);

      if (moves.size()) {
        moves.apply(clone);
        done = false;
      }
    }

    for (const key of solverKeys) {
      const solve = solvers[key];
      const moves = solve!(clone);

      if (moves.size()) {
        moves.apply(clone).applyAll(clone, Strategy.Neighbor);
        done = false;
      }
    }
  } while (!done);

  return clone.isSolved();
}

function canSolve(board: SimpleBoard): Map<string, number> | null {
  const counts = new Map<string, number>();
  const clone = board.clone();

  do {
    let anySolved = false;

    for (const key of solverKeys) {
      if (clone.hasErrors()) {
        return null;
      }
      if (clone.isSolved()) {
        return counts;
      }

      const solver = solvers[key]!;
      const moves = solver(clone);

      if (moves.size()) {
        // if (
        //   !["nakedSingles", "hiddenSingles", "intersectionRemovals"].includes(
        //     key
        //   )
        // ) {
        //   console.log("start", GRID.toString(clone));
        //   printAllCandidates(clone, true, true);
        //   console.log("solver:", key);
        //   console.log("moves:", moves.toString());
        // }
        anySolved = true;
        counts.set(key, (counts.get(key) || 0) + 1);
        const next = Moves.createEmpty();
        moves.first().apply(clone, next);
        next.applyAll(clone, Strategy.Neighbor);
        // restart from the first solver
        break;
      }
    }

    if (!anySolved) {
      // no strategies worked, and board not solved or invalid
      return null;
    }
  } while (true);
}
