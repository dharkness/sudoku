import { Puzzle } from "../models/puzzle";

import usePlayPuzzleActions from "./usePlayPuzzleActions";

import PlayablePuzzle from "./PlayablePuzzle";

type PlayPuzzleProps = {
  puzzle: Puzzle;
};

const PlayPuzzle = ({ puzzle }: PlayPuzzleProps): JSX.Element => {
  const actions = usePlayPuzzleActions(puzzle.start);
  const current = actions.current;

  if (!current) {
    return <div>An internal error occurred</div>;
  }

  const cantUndo = actions.step === 0;
  const cantRedo = actions.step >= actions.steps - 1;

  return (
    <div className="flex flex-row gap-10">
      <div>
        <PlayablePuzzle actions={actions} size={80} />
      </div>
      <div className="flex flex-col gap-10">
        <button
          type="button"
          disabled={cantUndo}
          onClick={actions.undo}
          className={cantUndo ? disabled : enabled}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={cantRedo}
          onClick={actions.redo}
          className={cantRedo ? disabled : enabled}
        >
          Redo
        </button>
        <button
          type="button"
          disabled={cantUndo}
          onClick={actions.reset}
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
