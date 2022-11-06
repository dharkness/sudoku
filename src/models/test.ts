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
import { GRID } from "./grid";
import {
  printAllCandidates,
  printCandidateCounts,
  printCandidates,
  printValues,
} from "./printers";
import { Solutions, solutionsFromString } from "./move";
import { createEmptySimpleBoard } from "./board";

import solveNakedPairs from "../solvers/solveNakedPairs";
import solveNakedTriples from "../solvers/solveNakedTriples";
import solveHiddenPairs from "../solvers/solveHiddenPairs";
import solveHiddenTriples from "../solvers/solveHiddenTriples";
import solveXWings from "../solvers/solveXWings";
import solveSinglesChains from "../solvers/solveSinglesChains";

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

// const start =
//   "254..3... .87....4. 9...2.... .3.7.4.12 ....9.4.7 ......5.. ....7...9 .2.....5. ....5637.";
// const full =
//   "254683791 687915243 913427865 538764912 162598437 479132586 345871629 726349158 891256374";

//
// ========== NEEDS INTERSECTIONS ========================================

// const start =
//   "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68..";
// const full =
//   "735148629 621359784 489627513 564873291 193562478 872491356 358214967 946785132 217936845";

//
// ========== NEEDS NAKED/HIDDEN PAIRS/TRIPLES ========================================

// const start =
//   "9........ 3...6..2. ..5...7.3 .31.84... 82..1.549 .4....8.. 75.1.6.8. 4..8..1.. ...7.....";
// const full =
//   "962378415 374561928 185429763 531984672 827613549 649257831 753196284 496832157 218745396";

//
// ========== NEEDS X-WING ========================================

// const start =
//   "1.....569 492.561.8 .561.924. ..964.8.1 .64.1.... 218.356.4 .4.5...16 9.5.614.2 621.....5";
// const full =
//   "187423569 492756138 356189247 539647821 764218953 218935674 843592716 975361482 621874395";

//
// ========== NEEDS SINGLES CHAIN ========================================

// const start =
//   "..7.836.. .397.68.. 826419753 64.19.387 .8.367... .73.48.6. 39.87..26 7649..138 2.863.97.";
// const full =
//   "517283649 439756812 826419753 645192387 182367495 973548261 391874526 764925138 258631974";

// const start =
//   "5.....42. ...6.7.1. ........3 ..4..2..8 ....79... .1.5..... ...34.8.. .51.2.... .7......6";
// const full =
//   "568913427 342687915 197254683 734162598 685479132 219538764 926345871 851726349 473891256";

// ========== NEEDS UNIQUE RECTANGLES ========================================

// const start =
//   ".4186539. .9..4..6. .3.7924.1 .28...94. 519624..3 .7.9.821. 15..8.629 .6..19.3. 98.2.61..";

// ========== NEEDS ??? ========================================

// const start =
//   "..8...... 2.7.5.9.. .....9.3. 5.9.7.3.. .4....... ...1....6 .8....2.. .3..4.... 4.27...1."

// ========== BREAKS BRUTE FORCE (OOM in browser) ========================================

// const start =
//   "..4...... ......... ..1.6.94. .8.....21 ..3.2.8.. 4........ .28.7.... .......8. .......9."

const start =
  "..8...... 2.7.5.9.. .....9.3. 5.9.7.3.. .4....... ...1....6 .8....2.. .3..4.... 4.27...1.";
const full =
  "398..7... 217.5.9.. 654..9.3. 529.7.3.1 146...... 8731....6 .8....2.. .3..4.... 4627...1.";

// const board = createEmptySimpleState();
// for (const [p, k] of [
//   [getPoint(0, 1), 1],
//   [getPoint(0, 2), 2],
//   [getPoint(0, 3), 3],
//   [getPoint(0, 4), 4],
//   [getPoint(0, 5), 5],
//   [getPoint(0, 6), 6],
//   [getPoint(0, 7), 7],
// ] as [Point, Known][]) {
//   BOARD.setKnown(board, p, k);
// }
// printValues(board);
// printAllCandidates(board);
// solveNakeds(board, 2);

const board = createEmptySimpleBoard();
const knowns = solutionsFromString(start).randomizedSolvedKnowns();
const pencils = [];
let stop = false;
while (!stop && (knowns.length || pencils.length)) {
  // check solvers
  const solved = new Solutions();
  solveNakedPairs(board, solved);
  solveNakedTriples(board, solved);
  solveHiddenPairs(board, solved);
  solveHiddenTriples(board, solved);
  solveXWings(board, solved);
  solveSinglesChains(board, solved);
  if (!solved.isEmpty()) {
    // console.info("FOUND", newSolutions);
    // nakeds do not solve knowns directly
    // knowns.push(...nakeds.randomizedSolvedKnowns());
    pencils.push(...solved.randomizedErasedPencils());
  }

  // apply all erased pencil marks
  while (!stop && pencils.length) {
    const [cell, known] = pencils.shift()!;
    if (!board.isCandidate(cell, known)) {
      continue;
    }

    console.log("");
    console.log("erasing", cell.toString(), "=>", known);
    board.removeCandidate(cell, known);
    // printAllCandidates(board);

    const test = GRID.toString(board);
    if (!GRID.validate(board) || !isCorrectSoFar(test, full)) {
      console.log("");
      printValues(board);
      console.log("");
      printAllCandidates(board);
      printCandidates(board, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = board.getSolved();
    board.clearSolved();
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
    if (board.getValue(cell) === known) {
      continue;
    }

    printValues(board);
    console.log("");
    console.log("solving", cell.toString(), "=>", known);
    board.setKnown(cell, known);

    const test = GRID.toString(board);
    if (!GRID.validate(board) || !isCorrectSoFar(test, full)) {
      printCandidates(board, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = board.getSolved();
    board.clearSolved();
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
    if (!board.isCandidate(cell, known)) {
      continue;
    }

    console.log("");
    console.log("erasing", cell.toString(), "=>", known);
    board.removeCandidate(cell, known);
    // printAllCandidates(board);

    const test = GRID.toString(board);
    if (!GRID.validate(board) || !isCorrectSoFar(test, full)) {
      console.log("");
      printValues(board);
      console.log("");
      printAllCandidates(board);
      printCandidates(board, known);
      console.error("STOPPED");
      stop = true;
      break;
    }

    const newSolutions = board.getSolved();
    board.clearSolved();
    if (!newSolutions.isEmpty()) {
      console.info("FOUND", newSolutions);
      knowns.push(...newSolutions.randomizedSolvedKnowns());
      pencils.push(...newSolutions.randomizedErasedPencils());
    }
    // break;
  }

  console.log(" ");
  printValues(board);
  printAllCandidates(board);
  // printCandidateCounts(board);
  // ALL_KNOWNS.forEach((k) => printCandidates(board, k));
  // break;
}

console.log("");
printAllCandidates(board);
// printCandidates(board, 5);
GRID.validate(board);
// console.log(board);

console.log("");
console.log("still", 81 - board.solvedCount(), "unknown");

const test = GRID.toString(board);
console.log("start   ", start);
console.log("current ", test);
console.log("solution", full);
console.log("diff    ", solutionDiff(test, full));

console.log("correct?", isCorrectSoFar(test, full));
console.log("complete?", isFullyCorrect(test, full));
