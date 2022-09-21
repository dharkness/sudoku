import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { BOARD, Cell, Group } from "../models/board";
import { Move, Strategy } from "../models/solutions";
import { ReadableState } from "../models/state";

import { singleSetValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for values in groups with a single candidate cell to solve,
 * ignoring naked singles.
 */
export default function solveHiddenSingles(state: ReadableState): Move[] {
  const moves: Move[] = [];
  const found = new Map<Cell, [Known, Set<Group>]>();

  for (const known of ALL_KNOWNS) {
    for (const [_, groups] of BOARD.groups) {
      for (const [_, group] of groups) {
        const cells = state.getCandidateCells(group, known);
        if (cells.size !== 1) {
          continue;
        }

        const cell = singleSetValue(cells);
        const candidates = state.getCandidates(cell);

        if (candidates.size === 1) {
          LOG &&
            console.info(
              "SKIP NAKED HIDDEN SINGLE",
              group.name,
              cell.point.k,
              known
            );
          continue;
        }

        if (found.has(cell)) {
          const entry = found.get(cell)!;

          if (entry[0] === known) {
            entry[1].add(group);
          } else {
            LOG &&
              console.warn(
                "SOLVE HIDDEN SINGLE",
                group.name,
                cell.point.k,
                known,
                "!=",
                entry[0]
              );
          }
        } else {
          found.set(cell, [known, new Set([group])]);
        }

        LOG &&
          console.info(
            "SOLVE HIDDEN SINGLE",
            group.name,
            cell.point.k,
            stringFromKnownSet(candidates),
            "=>",
            known
          );
      }
    }
  }

  for (const [cell, [known, groups]] of found) {
    moves.push(
      new Move(Strategy.HiddenSingle)
        .group(groups)
        .clue(cell, known)
        .set(cell, known)
    );
  }

  return moves;
}
