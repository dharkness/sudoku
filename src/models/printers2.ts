import {
  ALL_COORDS,
  ALL_GROUPINGS,
  ALL_KNOWNS,
  delta,
  getPoint,
  Grouping,
  Known,
  pointGroupCoordsToString,
  PointSet,
  UNKNOWN,
} from "./basics";
import { ReadableState } from "./state2";
import { BOARD, Cell } from "./structure2";

export function printValues(state: ReadableState) {
  console.log("  ", 123456789);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.map((c) => {
        const value = state.getValue(BOARD.getCell(getPoint(r, c)));
        return value === UNKNOWN ? "." : value.toString();
      }).join("")
    )
  );
}

export function printPossibleCounts(state: ReadableState) {
  console.log("  ", 123456789, "POSSIBLE COUNTS");
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.reduce((cells: string[], c) => {
        const count = state.getPossibleKnownsCount(
          BOARD.getCell(getPoint(r, c))
        );
        return [...cells, count ? count.toString() : "."];
      }, []).join("")
    )
  );
}

export function printAllPossibles(state: ReadableState) {
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
      const knowns = state.getPossibleKnowns(cell);
      for (const k of ALL_KNOWNS) {
        lines[4 * r + Math.floor((k - 1) / 3)]![1] += knowns.has(k)
          ? k.toString()
          : " ";
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

export function printPossibles(state: ReadableState, known: Known) {
  console.log("  ", 123456789, "POSSIBLES FOR", known);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.reduce((cells: string[], c) => {
        const possible = state.isPossibleKnown(
          BOARD.getCell(getPoint(r, c)),
          known
        );
        return [...cells, possible ? known.toString() : "."];
      }, []).join("")
    )
  );
  // FIXME Refactor to lay out groups correctly
  printRowPossibles(state, known);
  printColumnPossibles(state, known);
  printBlockPossibles(state, known);
}

function printRowPossibles(state: ReadableState, known: Known) {
  console.log("  ", 123456789, "ROW POSSIBLES FOR", known);
  for (const [r, row] of BOARD.rows) {
    const cells = state.getPossibleCells(row, known);
    console.log(r + 1, Cell.stringFromGroupCoords(0, cells));
  }
}

function printColumnPossibles(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [c, column] of BOARD.columns) {
    const cells = state.getPossibleCells(column, known);
    for (const r of ALL_COORDS) {
      lines[r] += cells.has(BOARD.getCell(getPoint(r, c)))
        ? (r + 1).toString()
        : ".";
    }
  }
  console.log("  ", 123456789, "COLUMN POSSIBLES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}

function printBlockPossibles(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [b, block] of BOARD.blocks) {
    const cells = state.getPossibleCells(block, known);
    block.cells.forEach(
      (cell) =>
        (lines[3 * Math.floor(b / 3) + (cell.point.r % 3)] += cells.has(cell)
          ? (cell.point.i[2] + 1).toString()
          : ".")
    );
  }
  console.log("  ", 123456789, "BLOCK POSSIBLES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}
