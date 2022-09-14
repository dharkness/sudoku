import { useCallback } from "react";

import { Known, Point } from "../models/basics";
import { Puzzle } from "../models/puzzle";

import PlayablePuzzle from "./PlayablePuzzle";
import usePlayPuzzleReducer from "./usePlayPuzzleReducer";

type PlayPuzzleProps = {
  puzzle: Puzzle;
};

const PlayPuzzle = ({ puzzle }: PlayPuzzleProps): JSX.Element => {
  const [{ steps, step }, dispatch] = usePlayPuzzleReducer(puzzle.start);
  const current = steps[step];

  const setCell = useCallback(
    (point: Point, known: Known) =>
      dispatch({ type: "set", point, known: known }),
    [dispatch]
  );

  const removePossible = useCallback(
    (point: Point, known: Known) =>
      dispatch({ type: "remove", point, known: known }),
    [dispatch]
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);
  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const cantUndo = step === 0;
  const cantRedo = step >= steps.length - 1;

  console.log(current);
  if (!current) {
    return <div>An internal error occurred</div>;
  }

  return (
    <div className="flex flex-row gap-10">
      <div>
        <PlayablePuzzle
          state={current}
          setCell={setCell}
          removePossible={removePossible}
          undo={undo}
          redo={redo}
          size={80}
        />
      </div>
      <div className="flex flex-col gap-10">
        <button
          type="button"
          disabled={cantUndo}
          onClick={undo}
          className={cantUndo ? disabled : enabled}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={cantRedo}
          onClick={redo}
          className={cantRedo ? disabled : enabled}
        >
          Redo
        </button>
        <button
          type="button"
          disabled={cantUndo}
          onClick={reset}
          className={cantUndo ? disabled : enabled}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

const enabled =
  "px-6 py-2 text-lg text-blue-100 transition-colors duration-300 bg-blue-500 rounded-full shadow-xl hover:bg-blue-600 shadow-blue-400/30";
const disabled =
  "px-6 py-2 text-lg bg-slate-500 rounded-full shadow-xl shadow-slate-400/30";

export default PlayPuzzle;
