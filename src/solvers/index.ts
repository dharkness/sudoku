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
import yWings from "./solveYWings";
import xyzWings from "./solveXYZWings";
import emptyRectangles from "./solveEmptyRectangles";
import uniqueRectangles from "./solveUniqueRectangles";
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
  yWings,
  xyzWings,
  emptyRectangles,
  uniqueRectangles,
  bruteForce,
} as {
  [key: string]: Solver;
};
