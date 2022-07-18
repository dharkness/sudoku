import { ALL_COORDS, ALL_GROUPINGS, ALL_POINTS } from "./board";
import { ALL_KNOWNS, EditablePuzzle, puzzleFromString } from "./editable";

export function solveSinglePossibleCell(puzzle: EditablePuzzle) {
  // todo track unknown cells in puzzle
  for (const p of ALL_POINTS) {
    const cell = puzzle.getCell(p);
    if (cell.possible.size === 1) {
      puzzle.setKnown(p, cell.possible.values().next().value);
      return true;
    }
  }

  return false;
}

export function solveSinglePossibleGroup(puzzle: EditablePuzzle) {
  for (const g of ALL_GROUPINGS) {
    const groups = puzzle.puzzle.groups.get(g)!;

    for (const c of ALL_COORDS) {
      const group = groups.get(c);
      if (!group) continue;

      for (const k of ALL_KNOWNS) {
        const points = group.get(k);
        if (!points) continue;

        if (points.size === 1) {
          puzzle.setKnown(points.values().next().value, k);
          return true;
        }
      }
    }
  }

  return false;
}

const solvers = [solveSinglePossibleCell, solveSinglePossibleGroup];

function solveAnyStep(puzzle: EditablePuzzle): boolean {
  return solvers.reduce((success, solver) => success || solver(puzzle), false);
}

const start =
  ".47.21689|.819.....|.638452.7|...75.92.|.7..32...|8.......3|49....1.2|7....483.|.2.5.....";

let steps = 100;
const puzzle = puzzleFromString(start);
puzzle.printValues();
while (solveAnyStep(puzzle) && steps--) {
  puzzle.printValues();
}
console.log("done");
puzzle.printPossibleCounts();
puzzle.printPossibles(3);
