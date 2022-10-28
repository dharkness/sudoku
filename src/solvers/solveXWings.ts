import { ALL_KNOWNS, Grouping } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { Cell, GRID, Group } from "../models/grid";
import { Move, Strategy } from "../models/solutions";

import {
  difference,
  distinctPairs,
  twoSetValues,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Looks for X-Wings in rows and columns to determine pencil marks to remove.
 * Removes found known from other cells in opposite row/column.
 *
 * Example: This grid of cells having 4 as a candidate shows an X-Wing in rows 2 and 5
 *
 *        ↓   ↓
 *     123456789
 *   1 ·········
 *   2 ···4···4·
 *   3 ·········
 *   4 ·········
 * → 5 ···4···4·
 * → 6 ·········
 *   7 ···4·····  ←-- remove 4 from cell 74
 *   8 ·······4·  ←-- remove 4 from cell 88
 *   9 ·········
 *
 * "1.....569 492.561.8 .561.924. ..964.8.1 .64.1.... 218.356.4 .4.5...16 9.5.614.2 621.....5"
 */
export default function solveXWings(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const k of ALL_KNOWNS) {
    for (const groups of [GRID.rows, GRID.columns]) {
      const candidates = Array.from(groups.values())
        .map((g) => [g, board.getCandidateCells(g, k)] as [Group, Set<Cell>])
        .filter(([_, cells]) => cells.size === 2)
        .map(([g, cells]) => new CandidateGroup(g, cells));

      for (const [cand1, cand2] of distinctPairs(candidates)) {
        if (!cand1.matches(cand2)) {
          continue;
        }

        const candidate = new Candidate(cand1, cand2);
        const markCells = difference(
          [candidate.cross1, candidate.cross2].reduce(
            (cells, cross) => union(cells, board.getCandidateCells(cross, k)),
            new Set<Cell>()
          ),
          candidate.cells
        );

        if (!markCells.size) {
          LOG &&
            console.info(
              "[x-wing] EMPTY",
              k,
              candidate.main1.name,
              candidate.main2.name,
              "x",
              candidate.cross1.name,
              candidate.cross2.name
            );

          continue;
        }

        LOG &&
          console.info(
            "[x-wing] SOLVE",
            k,
            candidate.main1.name,
            candidate.main2.name,
            "x",
            candidate.cross1.name,
            candidate.cross2.name,
            "∉",
            Cell.stringFromPoints(markCells)
          );

        moves.push(
          new Move(Strategy.XWing)
            .group(candidate.main1)
            .group(candidate.main2)
            .clue(candidate.cells, k)
            .mark(markCells, k)
        );
      }
    }
  }

  return moves;
}

class CandidateGroup {
  readonly main: Group;
  readonly cells: Set<Cell>;
  readonly cell1: Cell;
  readonly cell2: Cell;

  readonly cross1: Group;
  readonly cross2: Group;

  constructor(main: Group, cells: Set<Cell>) {
    this.main = main;
    this.cells = cells;

    const [c1, c2] = Cell.sortedByRowColumn(twoSetValues(cells)) as [
      Cell,
      Cell
    ];
    this.cell1 = c1;
    this.cell2 = c2;

    const cross =
      main.grouping === Grouping.ROW ? Grouping.COLUMN : Grouping.ROW;
    this.cross1 = c1.groups.get(cross)!;
    this.cross2 = c2.groups.get(cross)!;
  }

  matches(other: CandidateGroup): boolean {
    return this.cross1 === other.cross1 && this.cross2 === other.cross2;
  }
}

class Candidate {
  readonly main1: Group;
  readonly main2: Group;

  readonly cross1: Group;
  readonly cross2: Group;

  readonly cells: Set<Cell>;

  constructor(cg1: CandidateGroup, cg2: CandidateGroup) {
    this.main1 = cg1.main;
    this.main2 = cg2.main;

    this.cross1 = cg1.cross1;
    this.cross2 = cg1.cross2;

    this.cells = union(cg1.cells, cg2.cells);
  }
}
