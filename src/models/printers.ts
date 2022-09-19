import { ALL_COORDS, ALL_KNOWNS, getPoint, Known, UNKNOWN } from "./basics";
import { BOARD, Cell, Group } from "./board";
import { ReadableState } from "./state";

const MISSING = "·";

/**
 * Prints a grid of cells with their known value or a period.
 */
export function printValues(state: ReadableState) {
  console.log("  ", 123456789);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.map((c) => {
        const value = state.getValue(BOARD.getCell(getPoint(r, c)));
        return value === UNKNOWN ? MISSING : value.toString();
      }).join("")
    )
  );
}

/**
 * Prints a grid of cells with the number of candidates.
 */
export function printCandidateCounts(state: ReadableState) {
  console.log("  ", 123456789, "CANDIDATE COUNTS");
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.reduce((cells: string[], c) => {
        const count = state.getCandidateCount(BOARD.getCell(getPoint(r, c)));
        return [...cells, count ? count.toString() : MISSING];
      }, []).join("")
    )
  );
}

/**
 * Prints a grid of cells, with each cell showing its candidates.
 */
export function printAllCandidates(
  state: ReadableState,
  showKnowns: boolean = false
) {
  const lines = Array.from(Array(3 * 9 + 8), (_, i) =>
    [1, 5, 9, 13, 17, 21, 25, 29, 33].includes(i)
      ? [Math.floor((i - 1) / 4) + 1, ""]
      : [
          [11, 23].includes(i)
            ? "   --------------+---------------+--------------"
            : i % 4 === 3
            ? "                 |               |              "
            : "  ",
          "",
        ]
  );

  ALL_COORDS.forEach((r) => {
    ALL_COORDS.forEach((c) => {
      const cell = BOARD.getCell(getPoint(r, c));
      const value = state.getValue(cell);
      if (showKnowns && value !== UNKNOWN) {
        [0, 1, 2].forEach(
          (i) => (lines[4 * r + i]![1] += `${value}${value}${value}`)
        );
      } else {
        const candidates = state.getCandidates(cell);
        for (const k of ALL_KNOWNS) {
          lines[4 * r + Math.floor((k - 1) / 3)]![1] += candidates.has(k)
            ? k.toString()
            : MISSING;
        }
      }
      [0, 1, 2].forEach(
        (i) => (lines[4 * r + i]![1] += c !== 8 && c % 3 === 2 ? " | " : "  ")
      );
    });
  });

  console.log(
    "   ",
    1,
    "  ",
    2,
    "  ",
    3,
    "   ",
    4,
    "  ",
    5,
    "  ",
    6,
    "   ",
    7,
    "  ",
    8,
    "  ",
    9
  );
  lines.forEach((line) => console.log(line[0], line[1]));
}

export function printCandidates(state: ReadableState, known: Known) {
  printCellCandidates(state, known);
  printRowCandidates(state, known);
  printColumnCandidates(state, known);
  printBlockCandidates(state, known);
}

export function printRowCandidates(state: ReadableState, known: Known) {
  console.log("  ", 123456789, "ROW CANDIDATES FOR", known);
  for (const [r, row] of BOARD.rows) {
    const cells = state.getCandidateCells(row, known);
    console.log(r + 1, Cell.stringFromGroupCoords(0, cells));
  }
}

export function printCellCandidates(state: ReadableState, known: Known) {
  console.log("  ", 123456789, "CANDIDATES FOR", known);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.reduce((cells: string[], c) => {
        const candidate = state.isCandidate(
          BOARD.getCell(getPoint(r, c)),
          known
        );
        return [...cells, candidate ? known.toString() : MISSING];
      }, []).join("")
    )
  );
}
export function printColumnCandidates(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [c, column] of BOARD.columns) {
    const cells = state.getCandidateCells(column, known);
    for (const r of ALL_COORDS) {
      lines[r] += cells.has(BOARD.getCell(getPoint(r, c)))
        ? (r + 1).toString()
        : MISSING;
    }
  }

  console.log("  ", 123456789, "COLUMN CANDIDATES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}

export function printBlockCandidates(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [b, block] of BOARD.blocks) {
    const cells = state.getCandidateCells(block, known);
    block.cells.forEach(
      (cell) =>
        (lines[3 * Math.floor(b / 3) + (cell.point.r % 3)] += cells.has(cell)
          ? (cell.point.i[2] + 1).toString()
          : MISSING)
    );
  }

  console.log("  ", 123456789, "BLOCK CANDIDATES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}

export function printGroupCandidates(
  state: ReadableState,
  group: Group,
  description?: string
) {
  const lines = ["", "", "", "", "", "", "", "", ""];
  for (const cell of group.cells) {
    for (const k of ALL_KNOWNS) {
      lines[k - 1]! += state.isCandidate(cell, k) ? k.toString() : MISSING;
    }
  }

  console.log(
    "  ",
    123456789,
    description || "CANDIDATES FOR",
    group.toString()
  );
  lines.forEach((line, r) => console.log(r + 1, line));
}
