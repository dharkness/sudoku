import { ALL_COORDS, ALL_KNOWNS, getPoint, Known, UNKNOWN } from "./basics";
import { ReadableBoard } from "./board";
import { GRID, Cell, Group } from "./grid";

const MISSING = "·";

/**
 * Prints a grid of cells with their known value or a period.
 */
export function printValues(board: ReadableBoard, cli: boolean = false) {
  console.log("  ", 123456789);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      (cli ? " " : "") +
        ALL_COORDS.map((c) => {
          const value = board.getValue(GRID.getCell(getPoint(r, c)));
          return value === UNKNOWN ? MISSING : value.toString();
        }).join("")
    )
  );
}

/**
 * Prints a grid of cells with the number of candidates.
 */
export function printCandidateCounts(
  board: ReadableBoard,
  cli: boolean = false
) {
  console.log("  ", 123456789, "CANDIDATE COUNTS");
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      (cli ? " " : "") +
        ALL_COORDS.reduce((cells: string[], c) => {
          const count = board.getCandidateCount(GRID.getCell(getPoint(r, c)));
          return [...cells, count ? count.toString() : MISSING];
        }, []).join("")
    )
  );
}

/**
 * Prints a grid of cells, with each cell showing its candidates.
 */
export function printAllCandidates(
  board: ReadableBoard,
  showKnowns: boolean = false,
  cli: boolean = false
) {
  const lines = Array.from(Array(3 * 9 + 8), (_, i) =>
    [1, 5, 9, 13, 17, 21, 25, 29, 33].includes(i)
      ? [Math.floor((i - 1) / 4) + 1, cli ? " " : ""]
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
      const cell = GRID.getCell(getPoint(r, c));
      const value = board.getValue(cell);
      if (showKnowns && value !== UNKNOWN) {
        lines[4 * r]![1] += "   ";
        lines[4 * r + 1]![1] += ` ${value} `;
        lines[4 * r + 2]![1] += "   ";
      } else {
        const candidates = board.getCandidates(cell);
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

export function printCandidates(board: ReadableBoard, known: Known) {
  printCellCandidates(board, known);
  printRowCandidates(board, known);
  printColumnCandidates(board, known);
  printBlockCandidates(board, known);
}

export function printRowCandidates(board: ReadableBoard, known: Known) {
  console.log("  ", 123456789, "ROW CANDIDATES FOR", known);
  for (const [r, row] of GRID.rows) {
    const cells = board.getCandidateCells(row, known);
    console.log(r + 1, Cell.stringFromGroupCoords(0, cells));
  }
}

export function printCellCandidates(board: ReadableBoard, known: Known) {
  console.log("  ", 123456789, "CANDIDATES FOR", known);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.reduce((cells: string[], c) => {
        const candidate = board.isCandidate(
          GRID.getCell(getPoint(r, c)),
          known
        );
        return [...cells, candidate ? known.toString() : MISSING];
      }, []).join("")
    )
  );
}
export function printColumnCandidates(board: ReadableBoard, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [c, column] of GRID.columns) {
    const cells = board.getCandidateCells(column, known);
    for (const r of ALL_COORDS) {
      lines[r] += cells.has(GRID.getCell(getPoint(r, c)))
        ? (r + 1).toString()
        : MISSING;
    }
  }

  console.log("  ", 123456789, "COLUMN CANDIDATES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}

export function printBlockCandidates(board: ReadableBoard, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [b, block] of GRID.blocks) {
    const cells = board.getCandidateCells(block, known);
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
  board: ReadableBoard,
  group: Group,
  description?: string
) {
  const lines = ["", "", "", "", "", "", "", "", ""];
  for (const cell of group.cells) {
    for (const k of ALL_KNOWNS) {
      lines[k - 1]! += board.isCandidate(cell, k) ? k.toString() : MISSING;
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
