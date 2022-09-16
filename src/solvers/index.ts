import { ReadableState } from "../models/state";
import { Solutions } from "../models/solutions";

import singletons from "./solveSingletons";
import nakedPairs from "./solveNakedPairs";
import nakedTriples from "./solveNakedTriples";
import hiddenPairs from "./solveHiddenPairs";
import hiddenTriples from "./solveHiddenTriples";
import xWings from "./solveXWings";
import singlesChains from "./solveSinglesChains";
import bruteForce from "./solveBruteForce";

type Solver = (state: ReadableState, solutions: Solutions) => void;

export default {
  singletons,
  nakedPairs,
  nakedTriples,
  hiddenPairs,
  hiddenTriples,
  xWings,
  singlesChains,
  bruteForce,
} as {
  [key: string]: Solver;
};
