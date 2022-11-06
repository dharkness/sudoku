import { Move } from "../models/move";
import { ReadableBoard } from "../models/board";

import nakedSingles from "./solveNakedSingles";
import hiddenSingles from "./solveHiddenSingles";
import intersectionRemovals from "./solveIntersectionRemovals";
import nakedPairs from "./solveNakedPairs";
import nakedTriples from "./solveNakedTriples";
import nakedQuads from "./solveNakedQuads";
import hiddenPairs from "./solveHiddenPairs";
import hiddenTriples from "./solveHiddenTriples";
import hiddenQuads from "./solveHiddenQuads";
import xWings from "./solveXWings";
import singlesChains from "./solveSinglesChains";
import yWings from "./solveYWings";
import swordfish from "./solveSwordfish";
import xyzWings from "./solveXYZWings";
import jellyfish from "./solveJellyfish";
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
  nakedQuads,
  hiddenPairs,
  hiddenTriples,
  hiddenQuads,
  xWings,
  singlesChains,
  yWings,
  swordfish,
  xyzWings,
  jellyfish,
  emptyRectangles,
  uniqueRectangles,
  bruteForce,
} as {
  [key: string]: Solver;
};
