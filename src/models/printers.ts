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
import { ReadableState } from "./state";
import { BlockTracker, BOARD } from "./structure";

export function printValues(state: ReadableState) {
  console.log("  ", 123456789);
  ALL_COORDS.forEach((r) =>
    console.log(
      r + 1,
      ALL_COORDS.map((c) => {
        const value = state.getValue(getPoint(r, c));
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
        const count = state.getPossibleKnownsCount(getPoint(r, c));
        return [...cells, count ? count.toString() : "."];
      }, []).join("")
    )
  );
}

export function printAllPossibles(state: ReadableState) {
  // const lines = Array.from(Array(3 * 9 + 2), (_, i) =>
  //   [1, 5, 9, 14, 18, 22, 27, 31, 35].includes(i)
  //     ? [Math.floor((i - (i >= 27 ? 2 : i >= 14 ? 1 : 0) - 1) / 3) + 1, ""]
  //     : [". ", ""]
  // );
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
      const point = getPoint(r, c);
      const knowns = state.getPossibleKnowns(point);
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
        const possible = state.isPossibleKnown(getPoint(r, c)!, known);
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
    const points = state.getPossiblePoints(row, known);
    console.log(r + 1, pointGroupCoordsToString(0, points));
  }
}

function printColumnPossibles(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [c, column] of BOARD.columns) {
    const points = state.getPossiblePoints(column, known);
    for (const r of ALL_COORDS) {
      lines[r] += points.has(getPoint(r, c)) ? (r + 1).toString() : ".";
    }
  }
  console.log("  ", 123456789, "COLUMN POSSIBLES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}

function printBlockPossibles(state: ReadableState, known: Known) {
  const lines = Array.from(Array(9), () => "");
  for (const [b, block] of BOARD.blocks) {
    const points = state.getPossiblePoints(block, known);
    const topLeft = block.topLeft;
    BlockTracker.deltas.forEach(
      ([dr, dc], i) =>
        (lines[3 * Math.floor(b / 3) + dr] += points.has(delta(topLeft, dr, dc))
          ? (i + 1).toString()
          : ".")
    );
  }
  console.log("  ", 123456789, "BLOCK POSSIBLES FOR", known);
  lines.forEach((line, r) => console.log(r + 1, line));
}
