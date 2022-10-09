import { ALL_COORDS, getPoint } from "../../models/basics";
import { GRID } from "../../models/grid";
import { EMPTY_DECORATION } from "../../models/solutions";

import { PuzzleActions } from "./usePlayPuzzleActions";

import SelectableCell from "./SelectableCell";

type PuzzlePanelProps = {
  actions: PuzzleActions;
  size: number;
};

const PuzzlePanel = ({ actions, size }: PuzzlePanelProps): JSX.Element => {
  const { highlighted, previewed, selected } = actions;

  return (
    <div>
      <table className="table-fixed border-collapse text-center select-none cursor-pointer">
        <tbody>
          {ALL_COORDS.map((r) => (
            <tr
              key={r}
              className={`border-b ${
                r % 3 === 2 ? "border-black" : "border-slate-300"
              }`}
            >
              {ALL_COORDS.map((c) => {
                const cell = GRID.getCell(getPoint(r, c));

                return (
                  <SelectableCell
                    key={c}
                    cell={cell}
                    given={actions.getGivenValue(cell)}
                    value={actions.getValue(cell)}
                    highlighted={highlighted}
                    decoration={
                      previewed?.getDecoration(cell) || EMPTY_DECORATION
                    }
                    selected={selected === cell}
                    onSelect={() => actions.select(cell)}
                    size={size}
                    candidates={actions.getCandidates(cell)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PuzzlePanel;
