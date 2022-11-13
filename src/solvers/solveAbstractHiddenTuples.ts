import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Move, Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import {
  difference,
  distinctPairs,
  distinctTriples,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for hidden tuples in groups to determine pencil marks to remove.
 * Removes all other candidates from the tuple cells.
 */
export default function solveAbstractHiddenTuples(
  name: string,
  strategy: Strategy,
  tupleSizes: number[],
  tuplePicker: (tuples: [Known, Set<Cell>][]) => [Known, Set<Cell>][][],
  board: ReadableBoard
): Moves {
  const moves = Moves.createEmpty();

  for (const [g, groups] of GRID.groups) {
    for (const [_, group] of groups) {
      const tuples = ALL_KNOWNS.map(
        (k) => [k, board.getCandidateCells(group, k)] as [Known, Set<Cell>]
      ).filter(([_, cells]) => tupleSizes.includes(cells.size));

      for (const candidates of tuplePicker(tuples)) {
        const cellsByKnown = new Map(candidates);
        const cells = Array.from(cellsByKnown.values()).reduce(
          union,
          new Set()
        );
        if (cells.size !== candidates.length) {
          continue;
        }

        if (candidates.length >= 3) {
          if (
            distinctPairs(cellsByKnown.values()).filter(
              ([cs1, cs2]) => union(cs1, cs2).size === 2
            ).length
          ) {
            continue;
          }
        }
        if (candidates.length >= 4) {
          if (
            distinctTriples(cellsByKnown.values()).filter(
              ([cs1, cs2, cs3]) => union(union(cs1, cs2), cs3).size <= 3
            ).length
          ) {
            continue;
          }
        }

        const knowns = new Set(cellsByKnown.keys());
        const erase = new Map<Cell, Set<Known>>();
        const move = Move.start(strategy).group(group).clue(cells, knowns);

        for (const c of cells) {
          const diff = difference(board.getCandidates(c), knowns);
          if (diff.size) {
            erase.set(c, diff);
            move.mark(c, diff);
          }
        }

        if (!erase.size) {
          LOG &&
            console.info(
              `[${name}] EMPTY`,
              stringFromKnownSet(knowns),
              "in",
              group.name,
              Cell.stringFromGroupCoords(g, cells)
            );
          continue;
        }

        LOG &&
          console.info(
            `[${name}] FOUND`,
            stringFromKnownSet(knowns),
            "in",
            group.name,
            Cell.stringFromGroupCoords(g, cells),
            "erase",
            ...Array.from(erase.entries()).flatMap(([c, ks]) => [
              c.toString(),
              stringFromKnownSet(ks),
            ])
          );

        moves.add(move);
      }
    }
  }

  return moves;
}
