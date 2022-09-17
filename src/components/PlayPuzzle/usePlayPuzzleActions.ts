import { useMemo, useReducer } from "react";

import { Known, Point, UNKNOWN, Value } from "../../models/basics";
import { BOARD, Cell } from "../../models/board";
import { Solutions, solutionsFromString } from "../../models/solutions";
import {
  createEmptySimpleState,
  ReadableState,
  SimpleState,
} from "../../models/state";
import { singleSetValue } from "../../utils/collections";

export type PuzzleActions = {
  current: ReadableState;
  steps: number;
  step: number;

  selected: Point | null;
  locked: Value;
  highlighted: Value;
  singleton: Value;

  getInitialValue: (point: Point) => Value;
  getValue: (point: Point) => Value;
  getPossibles: (point: Point) => Set<Known>;

  highlight: (value: Value) => void;
  select: (point: Point) => void;
  setCell: (known: Known) => void;
  removePossible: (known: Known) => void;
  applySolutions: (solutions: Solutions) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;
};

/**
 * Manages the puzzle state and undo/redo history and provides actions.
 */
export default function usePlayPuzzleReducer(start?: string): PuzzleActions {
  const initialState = useMemo<State>(() => {
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
      locked: UNKNOWN,
    } as State;
  }, [start]);

  const [state, dispatch] = useReducer<Reducer>(reducer, initialState);

  return useMemo<PuzzleActions>(() => {
    const initial = state.steps[0]!.state;
    const current = state.steps[state.step]!.state;
    const selected = state.selected;
    const locked = state.locked;
    const possibles = selected ? BOARD.getPossibles(current, selected) : null;

    return {
      ...state,

      current,
      steps: state.steps.length,

      highlighted:
        locked || (selected ? BOARD.getValue(current, selected) : UNKNOWN),
      singleton: possibles?.size === 1 ? singleSetValue(possibles) : UNKNOWN,

      getInitialValue: (point: Point) => BOARD.getValue(initial, point),
      getValue: (point: Point) => BOARD.getValue(current, point),
      getPossibles: (point: Point) => BOARD.getPossibles(current, point),

      highlight: (value: Value) => dispatch({ type: "highlight", value }),
      select: (point: Point) => dispatch({ type: "select", point }),
      setCell: (known: Known) => dispatch({ type: "set", known: known }),
      removePossible: (known: Known) =>
        dispatch({ type: "remove", known: known }),
      applySolutions: (solutions: Solutions) =>
        dispatch({ type: "apply", solutions }),

      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      reset: () => dispatch({ type: "reset" }),
    } as PuzzleActions;
  }, [state]);
}

type State = {
  steps: StepNode[];
  step: number;

  selected: Point | null;
  locked: Value;
};

type StepNode = {
  state: SimpleState;
  selected: Point | null;
};

type Action =
  | { type: "highlight"; value: Value }
  | { type: "select"; point: Point }
  | { type: "set"; known: Known }
  | { type: "remove"; known: Known }
  | { type: "apply"; solutions: Solutions }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

type Reducer = (state: State, action: Action) => State;

const reducer: Reducer = (state: State, action: Action) => {
  const { step, selected } = state;

  switch (action.type) {
    case "highlight":
      return {
        ...state,
        locked: action.value,
      };

    case "select":
      return {
        ...state,
        selected: action.point,
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

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            BOARD.removePossible(clone, cell, known)
          );
        }

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

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            BOARD.removePossible(clone, cell, known)
          );
        }

        return clone;
      });

    case "apply":
      return addStep(state, (state: SimpleState) => {
        const { solutions } = action;
        const clone = new SimpleState(state);

        solutions.forEachSolvedKnown((cell: Cell, known: Known) =>
          BOARD.setKnown(clone, cell, known)
        );
        solutions.forEachErasedPencil((cell: Cell, known: Known) =>
          BOARD.removePossible(clone, cell, known)
        );

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            BOARD.removePossible(clone, cell, known)
          );
        }

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
  const { steps, step, selected } = state;
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
    steps: [...steps.slice(0, step + 1), { state: applied, selected }],
    step: step + 1,
  };
}

function setStep(state: State, step: number, select: number): State {
  if (!(0 <= step && step < state.steps.length)) {
    return state;
  }

  return {
    ...state,
    step,
    selected: state.steps[select]?.selected || null,
  };
}
