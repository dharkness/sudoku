import { useMemo, useReducer } from "react";

import { Known, Point, UNKNOWN, Value } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { solutionsFromString } from "../models/solutions";
import {
  createEmptySimpleState,
  ReadableState,
  SimpleState,
} from "../models/state";

export type PuzzleActions = {
  current: ReadableState;
  steps: number;
  step: number;
  selected: Point | null;
  highlighted: Value | null;

  select: (point: Point) => void;
  setCell: (known: Known) => void;
  removePossible: (known: Known) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;
};

/**
 * Manages the puzzle state and undo/redo history and provides actions.
 */
export default function usePlayPuzzleReducer(start?: string): PuzzleActions {
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

    return {
      steps: [{ state, selected: null }],
      step: 0,
      selected: null,
      highlighted: null,
    } as State;
  }, [start]);

  const [state, dispatch] = useReducer<Reducer>(reducer, initial);

  return useMemo<PuzzleActions>(
    () =>
      ({
        ...state,

        current: state.steps[state.step]!.state,
        steps: state.steps.length,

        select: (point: Point) => dispatch({ type: "select", point }),
        setCell: (known: Known) => dispatch({ type: "set", known: known }),
        removePossible: (known: Known) =>
          dispatch({ type: "remove", known: known }),

        undo: () => dispatch({ type: "undo" }),
        redo: () => dispatch({ type: "redo" }),
        reset: () => dispatch({ type: "reset" }),
      } as PuzzleActions),
    [state]
  );
}

type State = {
  steps: StepNode[];
  step: number;

  selected: Point | null;
  highlighted: Value | null;
};

type StepNode = {
  state: SimpleState;
  selected: Point | null;
};

type Action =
  | { type: "select"; point: Point }
  | { type: "set"; known: Known }
  | { type: "remove"; known: Known }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

type Reducer = (state: State, action: Action) => State;

const reducer: Reducer = (state: State, action: Action) => {
  const { steps, step, selected } = state;

  switch (action.type) {
    case "select":
      return {
        ...state,
        selected: action.point,
        highlighted: BOARD.getValue(steps[step]!.state, action.point),
      };

    case "set":
      if (!selected) {
        return state;
      }

      return addStep(state, (state: SimpleState) => {
        const { known } = action;

        if (!BOARD.isPossible(state, selected, known)) {
          return state;
        }

        const clone = new SimpleState(state);
        BOARD.setKnown(clone, selected, known);

        const solved = state.getSolved();
        state.clearSolved();
        solved.forEachErasedPencil((cell: Cell, known: Known) =>
          BOARD.removePossible(state, cell, known)
        );

        return clone;
      });

    case "remove":
      if (!selected) {
        return state;
      }

      return addStep(state, (state: SimpleState) => {
        const { known } = action;

        if (!BOARD.isPossible(state, selected, known)) {
          return state;
        }

        const clone = new SimpleState(state);
        BOARD.removePossible(clone, selected, known);

        const solved = state.getSolved();
        state.clearSolved();
        solved.forEachErasedPencil((cell, known) =>
          BOARD.removePossible(state, cell, known)
        );

        return clone;
      });

    case "undo":
      return setStep(state, step - 1, step);

    case "redo":
      return setStep(state, step + 1, step + 1);

    case "reset":
      return setStep(state, 0, 1);
  }
};

function addStep(
  state: State,
  apply: (state: SimpleState) => SimpleState
): State {
  const { steps, step } = state;
  const current = steps[step]?.state;

  if (!current) {
    throw new Error(`step ${step} out of bounds [0,${steps.length - 1}]`);
  }

  const applied = apply(current);
  if (applied === current) {
    // no action was performed
    return state;
  }

  return {
    ...state,
    steps: [
      ...steps.slice(0, step + 1),
      { state: applied, selected: state.selected },
    ],
    step: step + 1,
  };
}

function setStep(state: State, step: number, select: number): State {
  if (!(0 <= step && step < state.steps.length)) {
    return state;
  }

  const current = state.steps[step]!.state;
  const selected = state.steps[select]?.selected || null;

  return {
    ...state,
    step,
    selected,
    highlighted: selected ? BOARD.getValue(current, selected) : UNKNOWN,
  };
}
