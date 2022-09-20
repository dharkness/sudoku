import { Move } from "../models/solutions";
import { ReadableState } from "../models/state";

import singletons from "./solveSingletons";
import nakedPairs from "./solveNakedPairs";
import nakedTriples from "./solveNakedTriples";
import hiddenPairs from "./solveHiddenPairs";
import hiddenTriples from "./solveHiddenTriples";
import xWings from "./solveXWings";
import singlesChains from "./solveSinglesChains";
import bruteForce from "./solveBruteForce";

type Solver = (state: ReadableState) => Move[];

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
