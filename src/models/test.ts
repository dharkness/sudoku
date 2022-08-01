import { ALL_KNOWNS } from "./basics";
import { printPossibleCounts, printPossibles, printValues } from "./printers";
import { solutionsFromString } from "./solutions";
import { createEmptySimpleState } from "./state";
import { BOARD } from "./structure";

const start =
  ".47.21689 .819..... .638452.7 ...75.92. .7..32... 8.......3 49....1.2 7....483. .2.5.....";
const done =
  "547321689 281976354 963845217 634758921 179432568 852169743 495683172 716294835 328517496";

// const start =
//   ".18....4. 753...1.. ..6.57... .3..72..4 6.983.2.. 8....9... ..5.6..29 .7...8.61 ....1....";
// const done =
//   "218396745 753284196 496157832 531672984 649831257 827549613 185763429 374928561 962415378";

// const start =
//   "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68..";
// const done =
//   "735148629 621359785 489627513 564873291 193562478 872491356 358214967 946785132 217936845";

const state = createEmptySimpleState();
const solutions = [solutionsFromString(start)];
while (solutions.length) {
  const solved = solutions.shift()!;
  console.log(
    "solving",
    solved.size,
    "of",
    81 - state.getTotalSolved(),
    "unknowns"
  );
  for (const [p, k] of solved.randomized()) {
    BOARD.setKnown(state, p, k);
    if (state.getSolved().size) {
      solutions.push(state.getSolved());
      state.clearSolved();
    }
    printValues(state);
    // break;
  }

  // printPossibleCounts(state);
  // ALL_KNOWNS.forEach((k) => printPossibles(state, k));
  // break;
}

// console.log("still", 81 - state.getTotalSolved(), "unknown");
// console.log("done", BOARD.toString(state));
// console.log("correct?", done === BOARD.toString(state));
