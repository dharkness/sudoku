import usePlayPuzzleActions from "./usePlayPuzzleActions";
import usePlayPuzzleKeys from "./usePlayPuzzleKeys";

import HistoryPanel from "./HistoryPanel";
import PuzzlePanel from "./PuzzlePanel";
import SolverPanel from "./SolverPanel";
import KnownPanel from "./KnownPanel";

type PlayPuzzleProps = {
  start?: string;
};

const PlayPuzzle = ({ start }: PlayPuzzleProps): JSX.Element => {
  const actions = usePlayPuzzleActions(start);

  usePlayPuzzleKeys(actions);

  if (!actions.current) {
    return <div>An internal error occurred</div>;
  }

  return (
    <div className="flex flex-row gap-10">
      <PuzzlePanel actions={actions} size={80} />
      <KnownPanel actions={actions} />
      <HistoryPanel actions={actions} />
      <SolverPanel actions={actions} />
    </div>
  );
};

export default PlayPuzzle;
