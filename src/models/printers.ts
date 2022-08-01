import {
  ALL_COORDS,
  ALL_GROUPINGS,
  getPoint,
  Grouping,
  Known,
  pointGroupCoordsToString,
  UNKNOWN,
} from "./basics";
import { ReadableState } from "./state";

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
  // for (const [g, groups] of state.groups) {
  //   for (const [c, group] of groups) {
  //     const points = group.get(known);
  //     if (points?.size) {
  //       console.log(
  //         Grouping[g],
  //         c + 1,
  //         "-",
  //         pointGroupCoordsToString(g, points)
  //       );
  //     }
  //   }
  // }
}
