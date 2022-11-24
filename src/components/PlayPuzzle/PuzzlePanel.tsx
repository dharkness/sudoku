import {
  ALL_COORDS,
  COLUMN_LABELS,
  getPoint,
  ROW_LABELS,
} from "../../models/basics";
import { GRID } from "../../models/grid";

import { PuzzleActions } from "./usePlayPuzzleActions";

import SelectableCell from "./SelectableCell";
import { EMPTY_DECORATION } from "../../models/decoration";

type PuzzlePanelProps = {
  actions: PuzzleActions;
  size: number;
};

const PuzzlePanel = ({ actions, size }: PuzzlePanelProps): JSX.Element => {
  const { highlighted, previewed, selected } = actions;

  return (
    <div>
      <table className="table-fixed border-collapse text-center select-none cursor-pointer">
        <thead>
          <tr className="cursor-auto" style={{ height: size / 2 }}>
            <th></th>
            {ALL_COORDS.map((c) => (
              <th key={c}>
                <span>{COLUMN_LABELS[c]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_COORDS.map((r) => (
            <tr key={r}>
              <th className="cursor-auto" style={{ width: size / 2 }}>
                <span>{ROW_LABELS[r]}</span>
              </th>
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
              <th className="cursor-auto" style={{ width: size / 2 }}>
                <span>{ROW_LABELS[r]}</span>
              </th>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="cursor-auto" style={{ height: size / 2 }}>
            <th></th>
            {ALL_COORDS.map((c) => (
              <th key={c}>
                <span>{COLUMN_LABELS[c]}</span>
              </th>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PuzzlePanel;
