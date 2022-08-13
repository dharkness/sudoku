import {
  ALL_KNOWNS,
  ALL_POINTS,
  getPoint,
  isCorrectSoFar,
  isFullyCorrect,
  Known,
  Point,
  solutionDiff,
  stringFromKnownSet,
  UNKNOWN,
} from "./basics";
import {
  printAllPossibles,
  printPossibleCounts,
  printPossibles,
  // printPossibles,
  printValues,
} from "./printers";
import { Solutions, solutionsFromString } from "./solutions";
import { createEmptySimpleState } from "./state";
import { BOARD } from "./structure";

import solveNakedPairs from "../solvers/solveNakedPairs";
import solveNakedTriples from "../solvers/solveNakedTriples";
import solveHiddenPairs from "../solvers/solveHiddenPairs";
import solveHiddenTriples from "../solvers/solveHiddenTriples";

const EMPTY =
  "......... ......... ......... ......... ......... ......... ......... ......... .........";

//
// ========== SOLVED BY CELLS AND GROUPS ========================================

// const start =
//   ".5.78.... 9.823.756 27461..39 .4.9..... ...5.2.98 ..2..31.7 .....7.1. 43....9.5 1.93.....";
// const full =
//   "356789421 918234756 274615839 843971562 761542398 592863147 685497213 437126985 129358674";

// const start =
//   ".47.21689 .819..... .638452.7 ...75.92. .7..32... 8.......3 49....1.2 7....483. .2.5.....";
// const full =
//   "547321689 281976354 963845217 634758921 179432568 852169743 495683172 716294835 328517496";

// const start =
//   ".18....4. 753...1.. ..6.57... .3..72..4 6.983.2.. 8....9... ..5.6..29 .7...8.61 ....1....";
// const full =
//   "218396745 753284196 496157832 531672984 649831257 827549613 185763429 374928561 962415378";

//
// ========== NEEDS INTERSECTIONS ========================================

// const start =
//   "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68..";
// const full =
//   "735148629 621359784 489627513 564873291 193562478 872491356 358214967 946785132 217936845";

//
// ========== NEEDS NAKED/HIDDEN PAIRS/TRIPLES ========================================

const start =
  "9........ 3...6..2. ..5...7.3 .31.84... 82..1.549 .4....8.. 75.1.6.8. 4..8..1.. ...7.....";
const full =
  "962378415 374561928 185429763 531984672 827613549 649257831 753196284 496832157 218745396";

// const state = createEmptySimpleState();
// for (const [p, k] of [
//   [getPoint(0, 1), 1],
//   [getPoint(0, 2), 2],
//   [getPoint(0, 3), 3],
//   [getPoint(0, 4), 4],
//   [getPoint(0, 5), 5],
//   [getPoint(0, 6), 6],
//   [getPoint(0, 7), 7],
// ] as [Point, Known][]) {
//   BOARD.setKnown(state, p, k);
// }
// printValues(state);
// printAllPossibles(state);
// solveNakeds(state, 2);

const state = createEmptySimpleState();
const knowns = solutionsFromString(start).randomizedSolvedKnowns();
const pencils = [];
let stop = false;
while (!stop && (knowns.length || pencils.length)) {
  // check solvers
  const solved = new Solutions();
  solveNakedPairs(state, solved);
  solveNakedTriples(state, solved);
  solveHiddenPairs(state, solved);
  solveHiddenTriples(state, solved);
  if (!solved.isEmpty()) {
    // console.info("FOUND", newSolutions);
    // nakeds do not solve knowns directly
    // knowns.push(...nakeds.randomizedSolvedKnowns());
    pencils.push(...solved.randomizedErasedPencils());
  }

  // apply all erased pencil marks
  while (!stop && pencils.length) {
    const [cell, known] = pencils.shift()!;
    if (!state.isPossibleKnown(cell, known)) {
      continue;
    }

    console.log("");
    console.log("erasing", cell.toString(), "=>", known);
    BOARD.removePossible(state, cell, known);
    // printAllPossibles(state);

    const test = BOARD.toString(state);
    if (!BOARD.validate(state) || !isCorrectSoFar(test, full)) {
      console.log("");
      printValues(state);
      console.log("");
      printAllPossibles(state);
      printPossibles(state, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = state.getSolved();
    state.clearSolved();
    if (!newSolutions.isEmpty()) {
      // console.info("FOUND", newSolutions);
      knowns.push(...newSolutions.randomizedSolvedKnowns());
      pencils.push(...newSolutions.randomizedErasedPencils());
    }
    // break;
  }

  // apply next solved known
  if (knowns.length) {
    const [cell, known] = knowns.shift()!;
    if (state.getValue(cell) === known) {
      continue;
    }

    printValues(state);
    console.log("");
    console.log("solving", cell.toString(), "=>", known);
    BOARD.setKnown(state, cell, known);

    const test = BOARD.toString(state);
    if (!BOARD.validate(state) || !isCorrectSoFar(test, full)) {
      printPossibles(state, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = state.getSolved();
    state.clearSolved();
    if (!newSolutions.isEmpty()) {
      // console.info("FOUND", newSolutions);
      knowns.push(...newSolutions.randomizedSolvedKnowns());
      pencils.push(...newSolutions.randomizedErasedPencils());
    }
    // break;
  }

  // apply all erased pencil marks
  while (!stop && pencils.length) {
    const [cell, known] = pencils.shift()!;
    if (!state.isPossibleKnown(cell, known)) {
      continue;
    }

    console.log("");
    console.log("erasing", cell.toString(), "=>", known);
    BOARD.removePossible(state, cell, known);
    // printAllPossibles(state);

    const test = BOARD.toString(state);
    if (!BOARD.validate(state) || !isCorrectSoFar(test, full)) {
      console.log("");
      printValues(state);
      console.log("");
      printAllPossibles(state);
      printPossibles(state, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = state.getSolved();
    state.clearSolved();
    if (!newSolutions.isEmpty()) {
      console.info("FOUND", newSolutions);
      knowns.push(...newSolutions.randomizedSolvedKnowns());
      pencils.push(...newSolutions.randomizedErasedPencils());
    }
    // break;
  }

  console.log(" ");
  printValues(state);
  printAllPossibles(state);
  // printPossibleCounts(state);
  // ALL_KNOWNS.forEach((k) => printPossibles(state, k));
  // break;
}

console.log("");
printAllPossibles(state);
// printPossibles(state, 5);
BOARD.validate(state);
// console.log(state);

console.log("");
console.log("still", 81 - state.solvedCount(), "unknown");

const test = BOARD.toString(state);
console.log("start   ", start);
console.log("current ", test);
console.log("solution", full);
console.log("diff    ", solutionDiff(test, full));

console.log("correct?", isCorrectSoFar(test, full));
console.log("complete?", isFullyCorrect(test, full));
