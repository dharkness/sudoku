import { Known, stringFromKnownSet } from "../models/basics";
import { knownsWithNCandidates, ReadableBoard } from "../models/board";
import { Cell, Group } from "../models/grid";
import { Moves } from "../models/move";
import { Strategy } from "../models/strategy";
import { NOT_EQUAL, SOLVE_CELL } from "../models/symbols";

import { singleValue } from "../utils/collections";

const LOG = false;

/**
 * Looks for values in groups with a single candidate cell to solve,
 * ignoring naked singles.
 */
export default function solveHiddenSingles(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();
  const found = new Map<Cell, [Known, Set<Group>]>();

  for (const [known, group, cells] of knownsWithNCandidates(board, 1)) {
    const cell = singleValue(cells);
    const candidates = board.getCandidates(cell);

    if (candidates.size === 1) {
      LOG &&
        console.info(
          "[hidden-singles] IGNORE Naked Single",
          group.name,
          cell.key,
          known
        );
      continue;
    }

    if (found.has(cell)) {
      const [foundKnown, foundGroups] = found.get(cell)!;

      if (foundKnown === known) {
        foundGroups.add(group);
      } else {
        LOG &&
          console.warn(
            "[hidden-singles] MISMATCH",
            group.name,
            cell.key,
            known,
            NOT_EQUAL,
            foundKnown
          );
      }
    } else {
      found.set(cell, [known, new Set([group])]);
    }

    LOG &&
      console.info(
        "[hidden-singles] FOUND",
        group.name,
        cell.key,
        stringFromKnownSet(candidates),
        SOLVE_CELL,
        known
      );
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
