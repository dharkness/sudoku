import { ALL_POINTS, Known, UNKNOWN, valueFromString } from "./basics";
import { Cell, GRID } from "./grid";
import { MISSING } from "./symbols";

/**
 * Parses solutions from a partial or full puzzle string.
 *
 * Each row should contain the values for each cell, a digit for a solved cell
 * and any character (typically a period) for an unknown cell.
 * Rows may optionally be separated by any single character (typically a space).
 *
 * For example:
 *
 * "7..1....9 .2.3..7.. 4.9...... .6.8..2.. ......... .7...1.5. .....49.. .46..5..2 .1...68.."
 */
export function solvedCellsFromPuzzleString(values: string): Map<Cell, Known> {
  if (![81, 89].includes(values.length)) {
    throw new Error(
      `Puzzle string length ${values.length} must be 81 or 89 characters`
    );
  }

  const givens = new Map();
  const width = values.length === 81 ? 9 : 10;

  for (const p of ALL_POINTS) {
    const value = valueFromString(values.charAt(width * p.r + p.c));
    if (value !== UNKNOWN) {
      givens.set(GRID.getCell(p), value);
    }
  }

  return givens;
}

/**
 * Returns true if any cell in the test string doesn't match the solution.
 */
export function isCorrectSoFar(test: string, solution: string): boolean {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t !== s && "1" <= t && t <= "9" && "1" <= s && s <= "9") {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if the test string fully matches the solution.
 */
export function isFullyCorrect(test: string, solution: string): boolean {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t !== s && "1" <= s && s <= "9") {
      return false;
    }
  }

  return true;
}

/**
 * Compares two solved known strings and returns the differences as a string.
 */
export function solutionDiff(test: string, solution: string): string {
  if (test.length !== solution.length) {
    throw new Error("Test and solution strings must have equal length");
  }

  let result = "";
  for (let i = 0; i < test.length; i++) {
    const t = test[i]!;
    const s = solution[i]!;

    if (t === s || t < "1" || "9" < t || s < "1" || "9" < s) {
      result += MISSING;
    } else {
      result += "x";
    }
  }

  return result;
}
