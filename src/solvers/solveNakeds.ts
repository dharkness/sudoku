import { ReadableState } from "../models/state";
import { Solutions } from "../models/solutions";
import { BOARD } from "../models/structure";
import { stringFromKnownSet } from "../models/basics";
import { intersect, union } from "../utils/collections";

const LOG = false;

/**
 * Looks for naked pairs to determine pencil marks to remove.
 */
export function solveNakedPairs(
  state: ReadableState,
  solutions: Solutions
): void {
  [BOARD.rows, BOARD.columns, BOARD.blocks].forEach((groups, g) =>
    groups.forEach((group) => {
      group.cells.forEach((first) => {
        const firstPossibles = state.getPossibleKnowns(first);
        if (firstPossibles.size !== 2) {
          return;
        }

        group.cells.forEach((second) => {
          if (first.point.i[g]! >= second.point.i[g]!) {
            return;
          }

          const secondPossibles = state.getPossibleKnowns(second);
          if (secondPossibles.size !== 2) {
            return;
          }

          const pairPossibles = union(firstPossibles, secondPossibles);
          if (pairPossibles.size !== 2) {
            return;
          }

          // each cell has 2 possibles; do they form a pair?
          const possibles = union(pairPossibles, secondPossibles);
          if (possibles.size !== 2) {
            return;
          }

          LOG &&
            console.info(
              "found naked pair",
              group.name,
              stringFromKnownSet(possibles),
              first.toString(),
              stringFromKnownSet(firstPossibles),
              second.toString(),
              stringFromKnownSet(secondPossibles)
            );

          for (const cell of group.cells) {
            if ([first, second].includes(cell)) {
              continue;
            }
            for (const k of intersect(
              possibles,
              state.getPossibleKnowns(cell)
            )) {
              solutions.addErasedPencil(cell, k);
            }
          }
        });
      });
    })
  );
}

/**
 * Looks for naked triples to determine pencil marks to remove.
 */
export function solveNakedTriples(
  state: ReadableState,
  solutions: Solutions
): void {
  [BOARD.rows, BOARD.columns, BOARD.blocks].forEach((groups, g) =>
    groups.forEach((group) => {
      group.cells.forEach((first) => {
        const firstPossibles = state.getPossibleKnowns(first);
        if (firstPossibles.size < 2 || 3 < firstPossibles.size) {
          return;
        }

        group.cells.forEach((second) => {
          if (first.point.i[g]! >= second.point.i[g]!) {
            return;
          }

          const secondPossibles = state.getPossibleKnowns(second);
          if (secondPossibles.size < 2 || 3 < secondPossibles.size) {
            return;
          }

          const pairPossibles = union(firstPossibles, secondPossibles);
          if (pairPossibles.size < 2 || 3 < pairPossibles.size) {
            return;
          }

          group.cells.forEach((third) => {
            if (second.point.i[g]! >= third.point.i[g]!) {
              return;
            }

            const thirdPossibles = state.getPossibleKnowns(third);
            if (thirdPossibles.size < 2 || 3 < thirdPossibles.size) {
              return;
            }

            // each cell has 2 or 3 possibles; do they form a triple?
            const possibles = union(pairPossibles, thirdPossibles);
            if (possibles.size !== 3) {
              return;
            }

            console.info(
              "found naked triple",
              group.name,
              stringFromKnownSet(possibles),
              first.toString(),
              stringFromKnownSet(firstPossibles),
              second.toString(),
              stringFromKnownSet(secondPossibles),
              third.toString(),
              stringFromKnownSet(thirdPossibles)
            );

            for (const cell of group.cells) {
              if ([first, second, third].includes(cell)) {
                continue;
              }
              for (const k of intersect(
                possibles,
                state.getPossibleKnowns(cell)
              )) {
                solutions.addErasedPencil(cell, k);
              }
            }
          });
        });
      });
    })
  );
}
