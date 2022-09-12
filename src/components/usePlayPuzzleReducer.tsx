import { Dispatch, useMemo, useReducer } from "react";

import { Known, Point } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { solutionsFromString } from "../models/solutions";
import { createEmptySimpleState, SimpleState } from "../models/state";

export default function usePlayPuzzleReducer(
  start?: string
): [State, Dispatch<Action>] {
  const initial = useMemo<State>(() => {
    const state = createEmptySimpleState();

    if (start) {
      const knowns = solutionsFromString(start).randomizedSolvedKnowns();

      for (const [cell, known] of knowns) {
        BOARD.setKnown(state, cell, known);
      }

      const solved = state.getSolved();
      state.clearSolved();
      solved.forEachErasedPencil((cell, known) =>
        BOARD.removePossible(state, cell, known)
      );
    }

    return { steps: [state], step: 0 };
  }, [start]);

  return useReducer(reducer, initial);
}

type State = {
  steps: SimpleState[];
  step: number;
};

type Action =
  | { type: "set"; point: Point; known: Known }
  | { type: "remove"; point: Point; known: Known }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

type Reducer = (state: State, action: Action) => State;

const reducer: Reducer = (state: State, action: Action) => {
  const { steps, step } = state;

  switch (action.type) {
    case "set":
      return addNode(state, (state: SimpleState) => {
        const { point, known } = action;

        if (!BOARD.isPossible(state, point, known)) {
          return state;
        }

        const clone = new SimpleState(state);
        BOARD.setKnown(clone, point, known);

        const solved = state.getSolved();
        state.clearSolved();
        solved.forEachErasedPencil((cell: Cell, known: Known) =>
          BOARD.removePossible(state, cell, known)
        );

        return clone;
      });

    case "remove":
      return addNode(state, (state: SimpleState) => {
        const { point, known } = action;

        if (!BOARD.isPossible(state, point, known)) {
          return state;
        }

        const clone = new SimpleState(state);
        BOARD.removePossible(clone, point, known);

        const solved = state.getSolved();
        state.clearSolved();
        solved.forEachErasedPencil((cell, known) =>
          BOARD.removePossible(state, cell, known)
        );

        return clone;
      });

    case "undo":
      return step === 0 ? state : { steps, step: step - 1 };

    case "redo":
      return step >= steps.length - 1 ? state : { steps, step: step + 1 };

    case "reset":
      return step === 0 ? state : { steps, step: 0 };
  }
};

function addNode(
  state: State,
  apply: (state: SimpleState) => SimpleState
): State {
  const { steps, step } = state;
  const current = steps[step];

  if (!current) {
    throw new Error(`step ${step} out of bounds [0,${steps.length - 1}]`);
  }

  const applied = apply(current);
  if (applied === current) {
    // no action was performed
    return state;
  }

  return { steps: [...steps.slice(0, step + 1), applied], step: step + 1 };
}
