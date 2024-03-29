/**
 * Defines the implemented solver strategies along with the internal reasons
 * for solving a cell or removing a candidate.
 *
 * TODO Support clearing knowns and adding candidates?
 */
export enum Strategy {
  /**
   * A known given at the start of the puzzle.
   */
  Given, // cell, known -> set cell to known
  /**
   * A cell solved by the player.
   */
  Solve, // cell, known -> set cell to known
  /**
   * A mark removed from a cell by the player.
   */
  EraseMark, // cell, known -> remove candidate from cell

  /**
   * A mark removed from a cell as a consequence of solving one of its neighbors.
   */
  Neighbor,

  NakedSingle, // cell, candidate -> set cell to candidate; remove candidate from neighbors
  HiddenSingle, // cell, candidate, group(s) -> set cell to candidate
  PointingPair, // cells, candidate, intersection (follows from cells) -> cells; remove candidate from cells
  PointingTriple, // same ^
  BoxLineReduction, // same ^ in other direction

  NakedPair, // 2 cells, 2 candidates, 1 group -> cells; remove both candidates from other cells in group
  NakedTriple, // same ^ but with 3 cells and candidates
  NakedQuad,
  HiddenPair, // 2 cells, 2 candidates, 1 group -> remove other candidates from the cells
  HiddenTriple, // same ^ but with 3 cells and candidates
  HiddenQuad,

  Skyscraper,
  XWing, // 4 cells, 1 candidate; 1 direction (row or column) -> cells; remove candidate from other cells in given direction
  SinglesChain, // cells, 1 candidate -> cells; remove candidate from cells
  YWing,
  Swordfish,
  XYZWing,

  XYChains,
  ThreeDMedusa,
  Jellyfish,
  UniqueRectangle,

  EmptyRectangle, // block, (2 cells, 1 candidate) -> cells; remove candidate from cells

  BruteForce, // cell, candidate -> set cell to candidate
}
