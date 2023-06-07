import { Known, stringFromKnownSet } from "../models/basics";
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
 * Looks for naked tuples in groups to determine pencil marks to remove.
 * Removes the tuple candidates from other cells in the group.
 */
export default function solveAbstractNakedTuples(
  name: string,
  strategy: Strategy,
  tupleSizes: number[],
  tuplePicker: (tuples: [Cell, Set<Known>][]) => [Cell, Set<Known>][][],
  board: ReadableBoard
): Moves {
  const moves = Moves.createEmpty();

  // loop over all 27 houses
  //   # find cells with k candidates where k can be a set of tuple sizes
  //   create map cell -> candidates where candidates.size is in tupleSizes
  //   loop over all n-tuples of cells in map
  //     collect all candidates
  //     skip if not n
  //
  //     skip degenerates # naked pair in naked triple or naked pair/triple in naked quad
  //       e.g. a 2-tuple in a 3-tuple (e.g. [12, 123, 12] has a naked pair)

  for (const [g, groups] of GRID.groups) {
    for (const [_, group] of groups) {
      const tuples = Array.from(group.cells.values())
        .map((c) => [c, board.getCandidates(c)] as [Cell, Set<Known>])
        .filter(([_, knowns]) => tupleSizes.includes(knowns.size));

      for (const candidates of tuplePicker(tuples)) {
        const knownsByCell = new Map(candidates);
        const knownSets = knownsByCell.values();
        const knowns = Array.from(knownSets).reduce(union, new Set());
        if (knowns.size !== candidates.length) {
          continue;
        }

        if (candidates.length >= 3) {
          if (
            distinctPairs(knownSets).find(
              ([ks1, ks2]) => union(ks1, ks2).size === 2
            )
          ) {
            continue;
          }
        }
        if (candidates.length >= 4) {
          if (
            distinctTriples(knownSets).find(
              ([ks1, ks2, ks3]) => union(union(ks1, ks2), ks3).size <= 3
            )
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
              `[${name}] empty`,
              stringFromKnownSet(knowns),
              "in",
              group.name,
              Cell.stringFromGroupCoords(g, cells)
            );
          continue;
        }

        LOG &&
          console.info(
            `[${name}] found`,
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

        moves.add(move);
      }
    }
  }

  return moves;
}
