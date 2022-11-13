import { Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Move } from "../models/move";

import {
  difference,
  distinctPairs,
  distinctTriples,
  union,
} from "../utils/collections";
import { Strategy } from "../models/strategy";

const LOG = false;

/**
 * Looks for naked tuples in groups to determine pencil marks to remove.
 * Removes the tuple candidates from other cells in the group.
 */
export default function solveAbstractNakedTuples(
  name: string,
  strategy: Strategy,
  tupleSizes: number[],
  tuplePicker: (tuples: [Cell, Set<Known>][]) => [Cell, Set<Known>][][],
  board: ReadableBoard
): Move[] {
  const moves: Move[] = [];

  for (const [g, groups] of GRID.groups) {
    for (const [_, group] of groups) {
      const tuples = Array.from(group.cells.values())
        .map((c) => [c, board.getCandidates(c)] as [Cell, Set<Known>])
        .filter(([_, knowns]) => tupleSizes.includes(knowns.size));

      for (const candidates of tuplePicker(tuples)) {
        const knownsByCell = new Map(candidates);
        const knowns = Array.from(knownsByCell.values()).reduce(
          union,
          new Set()
        );
        if (knowns.size !== candidates.length) {
          continue;
        }

        if (candidates.length >= 3) {
          if (
            distinctPairs(knownsByCell.values()).filter(
              ([ks1, ks2]) => union(ks1, ks2).size === 2
            ).length
          ) {
            continue;
          }
        }
        if (candidates.length >= 4) {
          if (
            distinctTriples(knownsByCell.values()).filter(
              ([ks1, ks2, ks3]) => union(union(ks1, ks2), ks3).size <= 3
            ).length
          ) {
            continue;
          }
        }

        const cells = new Set(knownsByCell.keys());
        const erase = new Map<Known, Set<Cell>>();
        const move = Move.start(strategy).group(group).clue(cells, knowns);

        for (const k of knowns) {
          const diff = difference(board.getCandidateCells(group, k), cells);
          if (diff.size) {
            erase.set(k, diff);
            move.mark(diff, k);
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
            ...Array.from(erase.entries()).flatMap(([k, cells]) => [
              k,
              Cell.stringFromPoints(cells),
            ])
          );

        moves.push(move);
      }
    }
  }

  return moves;
}
