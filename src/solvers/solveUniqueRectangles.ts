import {
  ALL_COORDS,
  ALL_GROUPINGS,
  Coord,
  getPoint,
  Grouping,
  keyFromKnownSet,
  Known,
  stringFromKnownSet,
  Value,
} from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Move } from "../models/move";
import { Strategy } from "../models/strategy";

import {
  areEqual,
  difference,
  distinctPairs,
  distinctTriples,
  hasEvery,
  singleSetValue,
  twoSetValues,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for four cells that
 *
 * - form a rectangle,
 * - are in one or two blocks,
 * - contain the same two candidates (pair), and
 * - have additional candidates in at most two of the cells.
 *
 * They form a Unique Rectangle when
 *
 * 1. three have only the pair and the fourth has one or more additional candidates,
 * 2. two have only the pair and the other two share one additional candidate,
 * 3. two have only the pair and the other two each have a subset of two additional candidates,
 * 4. two have only the pair and one of the candidates must appear in the other two
 *    (last two candidate cells in their shared row/column/block) regardless of any additional candidates, or
 * 5. two have only the pair (diagonal) and one of the candidates is only possible in the rectangle
 *    in both rows or both columns regardless of any additional candidates.
 *
 * In type 1, the pair may be removed from the fourth cell.
 *
 * In type 2, the additional candidate may be removed from every cell that sees both cells with it.
 *
 * In type 3, in any group that shares the non-pair cells and another cell
 * containing just the additional candidates, they form a pseudo naked pair,
 * and the additional candidates may be removed from all other cells in the group.
 * This extends to pseudo naked triples, quads, etc. but may be trickier to find.
 *
 * In type 4, the other pair candidate may be removed from the second pair of cells.
 *
 * In type 5, the two diagonal cells that contain only the pair must form a naked pair even though
 * they are not neighbors by having one candidate of the pair required in both sides of the rectangle
 * by looking at the rows/columns/blocks containing the sides. In that case, the other pair candidate
 * may be removed from the naked pair cells.
 *
 * Example: Type 1.
 *
 *      1   2   3     4   5   6
 *     ··· ··· ··· | ··· ··· ···
 *   A ··· ·5· ··· | ··· ·5· ···
 *     ··· ··9 ··· | ··· ··9 ···
 *                 |
 *     ··· ··· ··· | ··· ·2· ···
 *   B ··· ·5· ··· | ··· 45· ···  ←-- cell B5 may not contain 5 or 9, and so they can be removed
 *     ··· ··9 ··· | ··· ··9 ···
 *
 * "..6324815 85.691.7. ..1785... ..4.3768. 38..62147 .6741835. ...173..8 ...846.21 ..82597.."
 *
 * Example: Type 2.
 *
 *      1   2   3     4   5   6     7   8   9
 *     ··· ··· ··· | ··· ··· ··· | ··· ··· ···
 *   A ··· ·5· ··· | ··· ··· ··· | ··· ·5· ···
 *     ··· ··9 ··· | ··· ··· ··· | ··· ··9 ···
 *                 |             |
 *     ·2· ·2· ··· | ··· ·2· ··· | ··· ·2· ···
 *   B ··· ·5· ··· | ··· ··· ··· | ··· ·5· ···  ←-- 2 must appear in cell B2 or B8,
 *     ··· ··9 ··· | ··· ··· ··· | ··· ··9 ···      and so it can be removed from cells B1 and B5
 *
 * "42.9..386 .6.2..794 8.9.6.251 7....3.25 9..1.26.3 2..5....8 ..4.2.567 6827..439 ......812"
 * ".4186539. .9..4..6. .3.7924.1 .28...94. 519624..3 .7.9.821. 15..8.629 .6..19.3. 98.2.61.."
 * "8.9....5. 53.8.7... ....9.8.. 2946.813. 78.9.1..4 .15..4.98 ..2.8.... .581.3.7. .6....48."
 *
 * Example: Type 3.
 *
 *      1   2   3     4   5   6     7   8   9
 *     ··· ··· ··· | ··· ··· ··· | ··· 12· ·2·
 *   A ··· ·5· ··· | ··· ··· ··· | ··· ·5· 4··
 *     ··· ··9 ··· | ··· ··· ··· | ··· ··9 ·89
 *                 |             |
 *     ··· ··· ··· | ··· ··· ··· | 1·3 ·2· 12·  ←-- (1 2) in cell B9 forms a pseudo naked pair
 *   B ··· ·5· ··· | ··· ··· ··· | 4·· ·5· ···      with cells A8 and B8, and so (1 2)
 *     ··· ··9 ··· | ··· ··· ··· | 7·· ··9 ···      can be removed from cells A9 and B7.
 *
 * "...5.347. 5..8.4.6. 4...96.52 857..96.4 3246.759. ..6..5.37 285.61.4. ..9..8..5 .43952.86"
 * "419.2...6 .6.1.9... .3.465921 .9.2.1.8. ..1.5.29. .7.9.4.1. ..65.2.79 .5.398.62 92......8"
 * "7529.8.4. 3..21.... .1....28. .63.82..9 .27.9.5.8 8..1...32 271..98.4 ....213.7 .3.874.2."
 *
 * Example: Type 4.
 *
 *      1   2   3     4   5   6     7   8   9
 *     ··· ··· ··· | ··· ··· ··· | ··· ··· ···
 *   A ··· ·5· ··· | ··· ··· ··· | ··· ·5· ···
 *     ··· ··9 ··· | ··· ··· ··· | ··· ··9 ···
 *                 |             |
 *     ··· ·2· ··· | ··· ··· ··· | ··· 1·· ···
 *   B ··· ·5· ··· | ·5· ·5· ··· | ··· 45· ···  ←-- 9 must appear in B2 or B8, so 5 can be removed
 *     ··· ··9 ··· | ··· ··· ··· | ··· ··9 ···      from them to avoid the deadly rectangle
 *
 * "..6324815 85.691.7. ..1785... ..4.3768. 38..62147 .6741835. ...173..8 ...846.21 ..82597.."
 *
 * Example: Type 5.
 *
 *      1   2   3     4   5   6     7   8   9
 *     ··· ··· ··· | ··· ··· ··· | ··· ·2· ···
 *   A ··· ·5· ··· | ··· ··· ··· | ··· 45· ···
 *     ··· ··9 ··9 | ··· ··9 ··· | ··· ··9 ···
 *                 |             |
 *     ··· 1·· ··· | ··· ··· ··· | ··· ··· ···
 *   B ··· 45· ··· | ··· ··· ··· | ··· ·5· ···  ←-- 5 must appear in cells A2 or A8 and also in B2 or B8,
 *     ··· ··9 ··· | ··· ··· ··9 | ··9 ··9 ···      and so 9 can be removed from cells A2 and B8
 *
 * "7..4.6..1 .2.8....5 1..3...9. 3.4..5... .7..3..1. ...6..3.9 .3.5....8 5....3.4. 6..1.9..3"
 *
 * @link https://www.sudokuwiki.org/Unique_Rectangles
 */
export default function solveUniqueRectangles(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  // find and group all tuple cells

  const tuples = new Map<string, [Set<Known>, Set<Cell>]>();
  for (const [_, cell] of GRID.cells) {
    const candidates = board.getCandidates(cell);
    if (candidates.size === 2) {
      const key = keyFromKnownSet(candidates);
      if (tuples.has(key)) {
        tuples.get(key)![1].add(cell);
      } else {
        tuples.set(key, [candidates, new Set([cell])]);
      }
    }
  }

  // check various cell permutations for each pair found

  for (const [_, [pair, cells]] of tuples) {
    if (cells.size < 2) {
      continue;
    }

    LOG &&
      console.info(
        "[unique-rectangle] PAIR",
        stringFromKnownSet(pair),
        "in",
        Cell.stringFromPoints(cells)
      );

    const [pair1, pair2] = twoSetValues(pair);
    const foundType1s = new Set<string>(); // blocks all other types once checked

    function checkType1(corners: Iterable<Cell>): void {
      const rect = Rectangle.fromCorners(corners);
      if (!rect || rect.blocks > 2 || foundType1s.has(rect.key)) {
        return;
      }

      LOG &&
        console.info(
          "[unique-rectangle] TRIPLE",
          Cell.stringFromPoints(corners),
          "in",
          Cell.stringFromPoints(rect.cells)
        );

      const fourth = singleSetValue(
        difference(new Set(rect.cells), new Set(corners))
      );
      const candidates = board.getCandidates(fourth);
      if (!hasEvery(pair, candidates)) {
        return;
      }

      LOG &&
        console.info(
          "[unique-rectangle] TYPE 1",
          stringFromKnownSet(pair),
          "x",
          fourth.key
        );

      foundType1s.add(rect.key);
      moves.push(
        Move.start(Strategy.UniqueRectangle)
          .clue(corners, pair)
          .mark(fourth, pair)
      );
    }

    // Check a rectangle where the floor cells are neighbors
    function checkNeighbors(
      floorLeft: Cell,
      floorRight: Cell,
      roofLeft: Cell,
      roofRight: Cell
    ): void {
      const rect = Rectangle.fromFourCorners([
        floorLeft,
        floorRight,
        roofLeft,
        roofRight,
      ]);
      if (rect.blocks > 2 || foundType1s.has(rect.key)) {
        return;
      }

      const roofLeftCandidates = board.getCandidates(roofLeft);
      const roofRightCandidates = board.getCandidates(roofRight);
      if (
        !hasEvery(pair, roofLeftCandidates) ||
        !hasEvery(pair, roofRightCandidates)
      ) {
        return;
      }

      const roofLeftExtra = difference(roofLeftCandidates, pair);
      const roofRightExtra = difference(roofRightCandidates, pair);

      LOG &&
        console.info(
          "[unique-rectangle] NEIGHBORS",
          rect.key,
          "floor",
          floorLeft.key,
          floorRight.key,
          "roof",
          roofLeft.key,
          stringFromKnownSet(roofLeftExtra),
          roofRight.key,
          stringFromKnownSet(roofRightExtra)
        );

      checkType2(
        floorLeft,
        floorRight,
        roofLeft,
        roofRight,
        rect,
        roofLeftExtra,
        roofRightExtra
      );
      checkType3(
        floorLeft,
        floorRight,
        roofLeft,
        roofRight,
        rect,
        roofLeftExtra,
        roofRightExtra
      );
      checkType4(roofLeft, roofRight, rect);
    }

    function checkDiagonals(first: Cell, second: Cell): void {
      const rect = Rectangle.fromOppositeCorners(first, second);
      if (rect.blocks > 2 || foundType1s.has(rect.key)) {
        return;
      }

      const floorLeft = first.point.c < second.point.c ? first : second;
      const floorRight = floorLeft === first ? second : first;
      const roof = difference(
        new Set(rect.cells),
        new Set([floorLeft, floorRight])
      );
      const [roofLeft, roofRight] = Cell.sortedByColumnRow(
        twoSetValues(roof)
      ) as [Cell, Cell];

      const roofLeftCandidates = board.getCandidates(roofLeft);
      const roofRightCandidates = board.getCandidates(roofRight);
      if (
        !hasEvery(pair, roofLeftCandidates) ||
        !hasEvery(pair, roofRightCandidates)
      ) {
        return;
      }

      const roofLeftExtra = difference(roofLeftCandidates, pair);
      const roofRightExtra = difference(roofRightCandidates, pair);

      LOG &&
        console.info(
          "[unique-rectangle] DIAGONAL",
          rect.key,
          "floor",
          floorLeft.key,
          floorRight.key,
          "roof",
          roofLeft.key,
          stringFromKnownSet(roofLeftExtra),
          roofRight.key,
          stringFromKnownSet(roofRightExtra)
        );

      checkType2(
        floorLeft,
        floorRight,
        roofLeft,
        roofRight,
        rect,
        roofLeftExtra,
        roofRightExtra
      );
      checkType3(
        floorLeft,
        floorRight,
        roofLeft,
        roofRight,
        rect,
        roofLeftExtra,
        roofRightExtra
      );
      checkType4(roofLeft, roofRight, rect);
      checkType5(floorLeft, floorRight, rect);
    }

    function checkType2(
      floorLeft: Cell,
      floorRight: Cell,
      roofLeft: Cell,
      roofRight: Cell,
      rect: Rectangle,
      roofLeftExtra: Set<Known>,
      roofRightExtra: Set<Known>
    ) {
      if (
        roofLeftExtra.size !== 1 ||
        !areEqual(roofLeftExtra, roofRightExtra)
      ) {
        return;
      }

      const candidate = singleSetValue(roofLeftExtra);
      const cells = Array.from(roofLeft.commonNeighbors.get(roofRight)!).filter(
        (c) => board.isCandidate(c, candidate)
      );
      if (!cells.length) {
        return;
      }

      LOG &&
        console.info(
          "[unique-rectangle] TYPE 2",
          candidate,
          "x",
          Cell.stringFromPoints(cells)
        );

      moves.push(
        Move.start(Strategy.UniqueRectangle)
          .clue(rect.cells, pair)
          .clue([roofLeft, roofRight], candidate, "yellow")
          .mark(cells, candidate)
      );
    }

    function checkType3(
      floorLeft: Cell,
      floorRight: Cell,
      roofLeft: Cell,
      roofRight: Cell,
      rect: Rectangle,
      roofLeftExtra: Set<Known>,
      roofRightExtra: Set<Known>
    ) {
      const extra = union(roofLeftExtra, roofRightExtra);
      if (extra.size !== 2) {
        return;
      }

      const [extra1, extra2] = twoSetValues(extra);
      const roofCells = new Set([roofLeft, roofRight]);
      for (const g of ALL_GROUPINGS) {
        const group = roofLeft.groups.get(g)!;
        if (group !== roofRight.groups.get(g)) {
          continue;
        }

        const neighbors = difference(group.cells, roofCells);
        const nakedPairs = Array.from(neighbors).filter((c) =>
          areEqual(extra, board.getCandidates(c))
        );
        if (nakedPairs.length !== 1) {
          continue;
        }

        const [nakedPair] = nakedPairs as [Cell];
        const cells = difference(
          union(
            board.getCandidateCells(group, extra1),
            board.getCandidateCells(group, extra2)
          ),
          roofCells
        );
        cells.delete(nakedPair);
        if (!cells.size) {
          continue;
        }

        LOG &&
          console.info(
            "[unique-rectangle] TYPE 3",
            stringFromKnownSet(extra),
            "x",
            Cell.stringFromPoints(cells)
          );

        moves.push(
          Move.start(Strategy.UniqueRectangle)
            .group(group)
            .clue(rect.cells, pair)
            .clue(roofCells, extra, "yellow")
            .clue(nakedPair, extra, "yellow")
            .mark(cells, extra)
        );
      }
    }

    function checkType4(roofLeft: Cell, roofRight: Cell, rect: Rectangle) {
      const markCells = new Set([roofLeft, roofRight]);
      for (const g of ALL_GROUPINGS) {
        const group = roofLeft.groups.get(g)!;
        if (group !== roofRight.groups.get(g)) {
          continue;
        }

        const pair1Required = board.getCandidateCells(group, pair1).size === 2;
        const pair2Required = board.getCandidateCells(group, pair2).size === 2;
        if (pair1Required === pair2Required) {
          // puzzle is already broken if both true
          continue;
        }

        const mark = pair1Required ? pair2 : pair1;

        LOG &&
          console.info(
            "[unique-rectangle] TYPE 4",
            mark,
            "x",
            Cell.stringFromPoints(markCells)
          );

        moves.push(
          Move.start(Strategy.UniqueRectangle)
            .group(group)
            .clue(rect.cells, pair)
            .mark(markCells, mark)
        );
      }
    }

    function checkType5(floorLeft: Cell, floorRight: Cell, rect: Rectangle) {
      let mark: Value = null;
      let groups: Group[] = [];

      function checkGroups(g: Grouping, checkPair: Known, otherPair: Known) {
        const groupLeft = floorLeft.groups.get(g)!;
        const groupRight = floorRight.groups.get(g)!;

        if (
          board.getCandidateCells(groupLeft, checkPair).size === 2 &&
          board.getCandidateCells(groupRight, checkPair).size === 2
        ) {
          mark = otherPair;
          groups = [groupLeft, groupRight];
        }
      }

      checkGroups(Grouping.ROW, pair1, pair2);
      checkGroups(Grouping.COLUMN, pair1, pair2);
      checkGroups(Grouping.ROW, pair2, pair1);
      checkGroups(Grouping.COLUMN, pair2, pair1);

      if (!mark) {
        return;
      }

      const markCells = new Set([floorLeft, floorRight]);

      LOG &&
        console.info(
          "[unique-rectangle] TYPE 5",
          mark,
          "x",
          Cell.stringFromPoints(markCells)
        );

      moves.push(
        Move.start(Strategy.UniqueRectangle)
          .group(groups)
          .clue(rect.cells, pair)
          .mark(markCells, mark)
      );
    }

    for (const corners of distinctTriples(cells)) {
      checkType1(corners);
    }

    for (const corners of distinctPairs(cells)) {
      const [first, second] = corners;

      if (first.point.r === second.point.r) {
        const left = first.point.c < second.point.c ? first : second;
        const right = left === first ? second : first;

        for (const r of ALL_COORDS) {
          if (r !== first.point.r) {
            checkNeighbors(
              left,
              right,
              GRID.getCell(getPoint(r, left.point.c)),
              GRID.getCell(getPoint(r, right.point.c))
            );
          }
        }
      } else if (first.point.c === second.point.c) {
        const left = first.point.r < second.point.r ? first : second;
        const right = left === first ? second : first;

        for (const c of ALL_COORDS) {
          if (c !== first.point.c) {
            checkNeighbors(
              left,
              right,
              GRID.getCell(getPoint(left.point.r, c)),
              GRID.getCell(getPoint(right.point.r, c))
            );
          }
        }
      } else {
        checkDiagonals(first, second);
      }
    }
  }

  return moves;
}

class Rectangle {
  cells: [Cell, Cell, Cell, Cell];
  tl: Cell;
  tr: Cell;
  bl: Cell;
  br: Cell;

  top: Coord;
  bottom: Coord;
  left: Coord;
  right: Coord;

  key: string;
  blocks: 1 | 2 | 4;

  private constructor(tl: Cell, tr: Cell, bl: Cell, br: Cell) {
    this.cells = [tl, tr, bl, br];
    this.tl = tl;
    this.tr = tr;
    this.bl = bl;
    this.br = br;
    this.top = tl.point.r;
    this.left = tl.point.c;
    this.bottom = br.point.r;
    this.right = br.point.c;
    this.key = `r${this.top + 1}${this.bottom + 1}c${this.left + 1}${
      this.right + 1
    }`;
    this.blocks =
      tl.point.b === tr.point.b
        ? tl.point.b === bl.point.b
          ? 1
          : 2
        : tl.point.b === bl.point.b
        ? 2
        : 4;
  }

  static fromCorners(cells: Iterable<Cell>): Rectangle | null {
    const rows = Cell.uniqueRows(cells);
    const columns = Cell.uniqueColumns(cells);

    if (rows.size !== 2 || columns.size !== 2) {
      return null;
    }

    const [top, bottom] = twoSetValues(rows);
    const [left, right] = twoSetValues(columns);

    return new Rectangle(
      GRID.getCell(getPoint(top, left)),
      GRID.getCell(getPoint(top, right)),
      GRID.getCell(getPoint(bottom, left)),
      GRID.getCell(getPoint(bottom, right))
    );
  }

  static fromOppositeCorners(first: Cell, second: Cell): Rectangle {
    const upper = first.point.r < second.point.r ? first : second;
    const lower = upper === first ? second : first;
    const top = upper.point.r;
    const bottom = lower.point.r;

    if (upper.point.c < lower.point.c) {
      const left = upper.point.c;
      const right = lower.point.c;

      return new Rectangle(
        upper,
        GRID.getCell(getPoint(top, right)),
        GRID.getCell(getPoint(bottom, left)),
        lower
      );
    } else {
      const left = lower.point.c;
      const right = upper.point.c;

      return new Rectangle(
        GRID.getCell(getPoint(top, left)),
        upper,
        lower,
        GRID.getCell(getPoint(bottom, right))
      );
    }
  }

  static fromFourCorners(cells: [Cell, Cell, Cell, Cell]): Rectangle {
    return new Rectangle(
      ...(Cell.sortedByRowColumn(cells) as [Cell, Cell, Cell, Cell])
    );
  }
}
