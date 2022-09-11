import { useCallback, useState } from "react";

import { Point, UNKNOWN, Value } from "../models/basics";
import { BOARD } from "../models/board";
import { Puzzle } from "../models/puzzle";
import { createEmptySimpleState, SimpleState } from "../models/state";
import { solutionsFromString } from "../models/solutions";

import PlayablePuzzle from "./PlayablePuzzle";

type PlayPuzzleProps = {
  puzzle: Puzzle;
};

const PlayPuzzle = ({ puzzle }: PlayPuzzleProps): JSX.Element => {
  const [state, setState] = useState<SimpleState>(() => {
    const state = createEmptySimpleState();
    const knowns = solutionsFromString(puzzle.start).randomizedSolvedKnowns();

    for (const [cell, known] of knowns) {
      BOARD.setKnown(state, cell, known);
    }

    const solved = state.getSolved();
    state.clearSolved();
    solved.forEachErasedPencil((cell, known) =>
      BOARD.removePossible(state, cell, known)
    );

    return state;
  });

  const setCell = useCallback((point: Point, value: Value) => {
    if (value === UNKNOWN) {
      // TODO
    } else {
      setState((state) => {
        if (!BOARD.isPossible(state, point, value)) {
          return state;
        }

        const clone = new SimpleState(state);
        BOARD.setKnown(clone, point, value);

        const solved = state.getSolved();
        state.clearSolved();
        solved.forEachErasedPencil((cell, known) =>
          BOARD.removePossible(state, cell, known)
        );

        return clone;
      });
    }
  }, []);

  return <PlayablePuzzle state={state} setCell={setCell} size={80} />;
};

export default PlayPuzzle;
