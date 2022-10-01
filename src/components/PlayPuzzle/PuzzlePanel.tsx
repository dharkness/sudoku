import { ALL_COORDS, getPoint } from "../../models/basics";
import { BOARD } from "../../models/board";
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
                const point = getPoint(r, c);
                const cell = BOARD.getCell(point);

                return (
                  <SelectableCell
                    key={c}
                    point={point}
                    given={actions.getGivenValue(point)}
                    value={actions.getValue(point)}
                    highlighted={highlighted}
                    decoration={
                      previewed?.getDecoration(cell) || EMPTY_DECORATION
                    }
                    selected={selected === point}
                    onSelect={() => actions.select(point)}
                    size={size}
                    candidates={actions.getCandidates(point)}
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
