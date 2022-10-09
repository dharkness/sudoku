import { useMemo, useReducer } from "react";

import { Known, UNKNOWN, Value } from "../../models/basics";
import {
  createEmptySimpleBoard,
  ReadableBoard,
  SimpleBoard,
} from "../../models/board";
import { Cell } from "../../models/grid";
import { Move, solutionsFromString } from "../../models/solutions";

import { singleSetValue } from "../../utils/collections";

export type PuzzleActions = {
  current: ReadableBoard;
  steps: number;
  step: number;

  selected: Cell | null;
  locked: Value;
  highlighted: Value;
  previewed: Move | null;
  singleton: Value;

  getGivenValue: (cell: Cell) => Value;
  getValue: (cell: Cell) => Value;
  getCandidates: (cell: Cell) => Set<Known>;

  highlight: (value: Value) => void;
  preview: (move: Move | null) => void;
  select: (cell: Cell) => void;
  setCell: (known: Known) => void;
  removeCandidate: (known: Known) => void;
  applyMoves: (moves: Move[]) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;
};

/**
 * Manages the puzzle state and undo/redo history and provides actions.
 */
export default function usePlayPuzzleActions(start?: string): PuzzleActions {
  const initialState = useMemo<State>(() => {
    const board = createEmptySimpleBoard();

    if (start) {
      const knowns = solutionsFromString(start).randomizedSolvedKnowns();

      for (const [cell, known] of knowns) {
        board.setKnown(cell, known);
      }

      const solved = board.getSolved();
      board.clearSolved();
      solved.forEachErasedPencil((cell, known) =>
        board.removeCandidate(cell, known)
      );
    }

    return {
      steps: [{ board, selected: null }],
      step: 0,
      selected: null,
      locked: UNKNOWN,
      previewed: null,
    } as State;
  }, [start]);

  const [state, dispatch] = useReducer<Reducer>(reducer, initialState);

  return useMemo<PuzzleActions>(() => {
    const { locked, previewed, selected, step, steps } = state;
    const givens = steps[0]!.board;
    const current = steps[step]!.board;

    const value = selected ? current.getValue(selected) : UNKNOWN;
    const candidates = selected ? current.getCandidates(selected) : null;

    const singleton =
      candidates?.size === 1 ? singleSetValue(candidates) : UNKNOWN;
    const highlighted = locked || value || singleton;

    return {
      current,
      step,
      steps: steps.length,

      selected,
      locked,
      highlighted,
      previewed,
      singleton,

      getGivenValue: (cell: Cell) => givens.getValue(cell),
      getValue: (cell: Cell) => current.getValue(cell),
      getCandidates: (cell: Cell) => current.getCandidates(cell),

      highlight: (value: Value) => dispatch({ type: "highlight", value }),
      preview: (move: Move | null) => dispatch({ type: "preview", move }),
      select: (cell: Cell) => dispatch({ type: "select", cell }),
      setCell: (known: Known) => dispatch({ type: "set", known: known }),
      removeCandidate: (known: Known) =>
        dispatch({ type: "remove", known: known }),
      applyMoves: (moves: Move[]) => dispatch({ type: "apply", moves }),

      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      reset: () => dispatch({ type: "reset" }),
    } as PuzzleActions;
  }, [state]);
}

type State = {
  steps: StepNode[];
  step: number;

  selected: Cell | null;
  locked: Value;
  previewed: Move | null;
};

type StepNode = {
  board: SimpleBoard;
  selected: Cell | null;
};

type Action =
  | { type: "highlight"; value: Value }
  | { type: "preview"; move: Move | null }
  | { type: "select"; cell: Cell }
  | { type: "set"; known: Known }
  | { type: "remove"; known: Known }
  | { type: "apply"; moves: Move[] }
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

    case "preview":
      return {
        ...state,
        previewed: action.move,
      };

    case "select":
      return {
        ...state,
        selected: action.cell,
      };

    case "set":
      if (!selected) {
        return state;
      }

      return addStep(state, (board: SimpleBoard) => {
        const { known } = action;

        if (!board.isCandidate(selected, known)) {
          return board;
        }

        const clone = new SimpleBoard(board);
        clone.setKnown(selected, known);

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            clone.removeCandidate(cell, known)
          );
        }

        return clone;
      });

    case "remove":
      if (!selected) {
        return state;
      }

      return addStep(state, (board: SimpleBoard) => {
        const { known } = action;

        if (!board.isCandidate(selected, known)) {
          return board;
        }

        const clone = new SimpleBoard(board);
        clone.removeCandidate(selected, known);

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            clone.removeCandidate(cell, known)
          );
        }

        return clone;
      });

    case "apply":
      const newState = addStep(state, (board: SimpleBoard) => {
        const { moves } = action;
        // const move = moves[Math.floor(Math.random() * moves.length)];
        const move = moves[0];

        if (!move) {
          return board;
        }

        const clone = new SimpleBoard(board);

        // moves.forEach((move) => move.apply(clone));
        move.apply(clone);

        let solved;
        while (!(solved = clone.getSolved()).isEmpty()) {
          clone.clearSolved();
          solved.forEachErasedPencil((cell: Cell, known: Known) =>
            clone.removeCandidate(cell, known)
          );
        }

        return clone;
      });

      return {
        ...newState,
        previewed: null,
      };

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
  apply: (board: SimpleBoard) => SimpleBoard
): State {
  const { steps, step, selected } = state;
  const current = steps[step]?.board;

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
    steps: [...steps.slice(0, step + 1), { board: applied, selected }],
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
