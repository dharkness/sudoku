import { ALL_COORDS, getPoint } from "../../models/basics";

import { PuzzleActions } from "./usePlayPuzzleActions";

import SelectableCell from "./SelectableCell";

type PuzzlePanelProps = {
  actions: PuzzleActions;
  size: number;
};

const PuzzlePanel = ({ actions, size }: PuzzlePanelProps): JSX.Element => {
  return (
    <table className="table-fixed border border-collapse border-black text-center select-none cursor-pointer">
      <tbody>
        {ALL_COORDS.map((r) => (
          <tr
            key={r}
            className={`border-b ${
              r % 3 === 2 ? "border-black" : "border-slate-300"
            }`}
          >
            {ALL_COORDS.map((c) => {
              const point = getPoint(r, c);
              return (
                <SelectableCell
                  key={c}
                  point={point}
                  initial={actions.getInitialValue(point)}
                  value={actions.getValue(point)}
                  highlighted={actions.highlighted}
                  selected={actions.selected === point}
                  onSelect={() => actions.select(point)}
                  size={size}
                  possibles={actions.getPossibles(point)}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PuzzlePanel;
