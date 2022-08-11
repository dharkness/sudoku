import {
  ALL_KNOWNS,
  ALL_POINTS,
  getPoint,
  isCorrectSoFar,
  isFullyCorrect,
  Known,
  Point,
  solutionDiff,
  UNKNOWN,
} from "./basics";
import {
  printAllPossibles,
  printPossibleCounts,
  printPossibles,
  // printPossibles,
  printValues,
} from "./printers2";
import { solutionsFromString } from "./solutions";
import { createEmptySimpleState } from "./state2";
import { BOARD } from "./structure2";

const EMPTY =
  "......... ......... ......... ......... ......... ......... ......... ......... .........";

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

// ========== NEEDS INTERSECTIONS ========================================

// const start =
//   "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68..";
// const full =
//   "735148629 621359784 489627513 564873291 193562478 872491356 358214967 946785132 217936845";

// ========== NEEDS NAKED TRIPLES and ??? ========================================

// ROW 2 has 489
const start =
  "9........ 3...6..2. ..5...7.3 .31.84... 82..1.549 .4....8.. 75.1.6.8. 4..8..1.. ...7.....";
const full =
  "9..3..... 3..56..2. ..54..7.3 531984... 827613549 6492..831 75.1.6.8. 4..8..1.. ...7.....";

// const state = createEmptySimpleState();
// for (const [p, k] of [
//   [getPoint(0, 1), 4],
//   [getPoint(0, 2), 7],
// ] as [Point, Known][]) {
//   BOARD.setKnown(state, p, k);
//   // if (!BOARD.validate(state)) {
//   printValues(state);
//   printAllPossibles(state);
//   printPossibles(state, 7);
//   // break;
//   // }
// }

const state = createEmptySimpleState();
const solutions = [solutionsFromString(start)];
let stop = false;
while (!stop && solutions.length) {
  const solved = solutions.shift()!;
  console.log(
    "solving",
    solved.size,
    "of",
    81 - state.solvedCount(),
    "unknowns"
  );
  console.log(solved);

  for (const [p, k] of solved.ordered()) {
    const value = BOARD.getValue(state, p);
    if (![UNKNOWN, k].includes(value)) {
      console.log("STOPPED AT", p.k, "=>", k, "x", value);
      stop = true;
      break;
    }
    BOARD.setKnown(state, p, k);
    const test = BOARD.toString(state);
    console.log("");
    printValues(state);
    console.log("");
    printAllPossibles(state);
    printPossibles(state, k);
    if (!BOARD.validate(state) || !isCorrectSoFar(test, full)) {
      console.log("STOPPED AT", p.k, "=>", k, "INVALID");
      stop = true;
      break;
    }
    if (state.getSolved().size) {
      solutions.push(state.getSolved());
      state.clearSolved();
    }
    // break;
  }

  printPossibleCounts(state);
  // ALL_KNOWNS.forEach((k) => printPossibles(state, k));
  // break;
}

console.log("");
printAllPossibles(state);
printPossibles(state, 5);
BOARD.validate(state);
// console.log(state);

console.log("still", 81 - state.solvedCount(), "unknown");

const test = BOARD.toString(state);
console.log("start   ", start);
console.log("current ", test);
console.log("solution", full);
console.log("diff    ", solutionDiff(test, full));

console.log("correct?", isCorrectSoFar(test, full));
console.log("complete?", isFullyCorrect(test, full));
