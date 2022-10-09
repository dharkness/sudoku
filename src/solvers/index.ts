import { Move } from "../models/solutions";
import { ReadableBoard } from "../models/board";

import nakedSingles from "./solveNakedSingles";
import hiddenSingles from "./solveHiddenSingles";
import intersectionRemovals from "./solveIntersectionRemovals";
import nakedPairs from "./solveNakedPairs";
import nakedTriples from "./solveNakedTriples";
import hiddenPairs from "./solveHiddenPairs";
import hiddenTriples from "./solveHiddenTriples";
import xWings from "./solveXWings";
import singlesChains from "./solveSinglesChains";
import emptyRectangles from "./solveEmptyRectangles";
import bruteForce from "./solveBruteForce";

type Solver = (board: ReadableBoard) => Move[];

export default {
  nakedSingles,
  hiddenSingles,
  intersectionRemovals,
  nakedPairs,
  nakedTriples,
  hiddenPairs,
  hiddenTriples,
  xWings,
  singlesChains,
  emptyRectangles,
  bruteForce,
} as {
  [key: string]: Solver;
};
