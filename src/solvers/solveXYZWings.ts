import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import {
  combinePairs,
  excluding,
  intersect,
  singleSetValue,
  twoSetValues,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for Y-Wings where the first cell contains all three values
 * instead of only the first two. In this case, only cells that can
 * see all three cells in the wing may have the third value eliminated.
 *
 * Example: The 7s in cells A1 and A3.
 *
 *      1   2   3     4   5   6
 *     ··· ··· ··· | ··· ··· ···
 *   A ··· ·5· ··· | ··· ·5· ···
 *     7·· 7·9 7·· | ··· 7·· ···
 *                 |
 *     ··· ··· ··· | ··· ··· ···
 *   B ··· ··· ··· | ··· ··· ···
 *     7·9 ··· ··· | ··· ··· ···
 *
 * ".92..175. 5..2....8 ....3.2.. .75..496. 2...6..75 .697...3. ..8.9..2. 7....3.89 9.38...4."
 *
 * @link https://www.sudokuwiki.org/XYZ_Wing
 */
export default function solveXYZWings(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();

  const allCandidates = Array.from(GRID.cells.values()).map(
    (c) => [c, board.getCandidates(c)] as [Cell, Set<Known>]
  );
  // XYZ cells
  const triples = new Map(allCandidates.filter(([_, ks]) => ks.size === 3));
  // maps each candidate Z to all cells that contain Z grouped by the other candidate X or Z they contain
  const pairCellsByXYByZ = new Map(
    ALL_KNOWNS.map(
      (z) =>
        [
          z,
          allCandidates
            .filter(([_, pair]) => pair.size === 2 && pair.has(z))
            .reduce((map, [c, pair]) => {
              const xy = singleSetValue(excluding(pair, z));
              if (map.has(xy)) {
                map.get(xy)!.add(c);
              } else {
                map.set(xy, new Set([c]));
              }
              return map;
            }, new Map<Known, Set<Cell>>()),
        ] as [Known, Map<Known, Set<Cell>>]
    )
  );

  for (const [cell, triple] of triples) {
    for (const z of triple) {
      const [x, y] = twoSetValues(excluding(triple, z));
      const pairCellsByXY = pairCellsByXYByZ.get(z)!;
      if (!pairCellsByXY.has(x) || !pairCellsByXY.has(y)) {
        continue;
      }

      const xNeighbors = intersect(cell.neighbors, pairCellsByXY.get(x)!);
      const yNeighbors = intersect(cell.neighbors, pairCellsByXY.get(y)!);
      if (!xNeighbors.size || !yNeighbors.size) {
        continue;
      }

      for (const [xCell, yCell] of combinePairs(xNeighbors, yNeighbors)) {
        if (xCell.sees(yCell)) {
          // naked triple as all three cells see each other
          continue;
        }

        // remove Z from cells that see all three XYZ cells
        const markCells = Array.from(
          intersect(cell.neighbors, xCell.commonNeighbors.get(yCell)!)
        ).filter((c) => board.getCandidates(c).has(z));
        if (!markCells.length) {
          continue;
        }

        LOG &&
          console.info(
            "[xyz-wing] FOUND",
            cell.toString(),
            stringFromKnownSet(triple),
            xCell.toString(),
            x,
            yCell.toString(),
            y,
            "x",
            z,
            Cell.stringFromPoints(markCells)
          );

        moves
          .start(Strategy.XYZWing)
          .clue([cell, xCell, yCell], [x, y])
          .clue([cell, xCell, yCell], z, "yellow")
          .mark(markCells, z);
      }
    }
  }

  return moves;
}
