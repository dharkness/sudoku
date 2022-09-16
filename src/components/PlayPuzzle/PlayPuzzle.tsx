import usePlayPuzzleActions from "./usePlayPuzzleActions";
import usePlayPuzzleKeys from "./usePlayPuzzleKeys";

import HistoryPanel from "./HistoryPanel";
import PuzzlePanel from "./PuzzlePanel";

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
      <HistoryPanel actions={actions} />
    </div>
  );
};

export default PlayPuzzle;
