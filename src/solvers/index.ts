import { ReadableBoard } from "../models/board";
import { Moves } from "../models/move";

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
import skyscrapers from "./solveSkyscrapers";
import xyzWings from "./solveXYZWings";

import xyChains from "./solveXYChains";
import threeDMedusa from "./solveThreeDMedusa";
import jellyfish from "./solveJellyfish";
import uniqueRectangles from "./solveUniqueRectangles";

import emptyRectangles from "./solveEmptyRectangles";

import bruteForce from "./solveBruteForce";

type Solver = (board: ReadableBoard) => Moves;

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

  skyscrapers,
  xWings,
  singlesChains,
  yWings,
  swordfish,
  xyzWings,

  xyChains,
  threeDMedusa,
  jellyfish,
  uniqueRectangles,

  emptyRectangles,

  bruteForce,
} as {
  [key: string]: Solver;
};
