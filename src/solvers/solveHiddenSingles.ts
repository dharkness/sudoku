import { ALL_KNOWNS, Known, stringFromKnownSet } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell, Group } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import { singleValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for values in groups with a single candidate cell to solve,
 * ignoring naked singles.
 */
export default function solveHiddenSingles(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();
  const found = new Map<Cell, [Known, Set<Group>]>();

  for (const known of ALL_KNOWNS) {
    for (const [_, groups] of GRID.groups) {
      for (const [_, group] of groups) {
        const cells = board.getCandidateCells(group, known);
        if (cells.size !== 1) {
          continue;
        }

        const cell = singleValue(cells);
        const candidates = board.getCandidates(cell);

        if (candidates.size === 1) {
          LOG &&
            console.info(
              "SKIP NAKED HIDDEN SINGLE",
              group.name,
              cell.key,
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
                cell.key,
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
            cell.key,
            stringFromKnownSet(candidates),
            "=>",
            known
          );
      }
    }
  }

  for (const [cell, [known, groups]] of found) {
    moves
      .start(Strategy.HiddenSingle)
      .group(groups)
      .clue(cell, known)
      .set(cell, known);
  }

  return moves;
}
