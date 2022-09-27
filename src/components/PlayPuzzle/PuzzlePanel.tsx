import { ALL_COORDS, getPoint, Known } from "../../models/basics";
import { BOARD, Cell } from "../../models/board";
import { Move } from "../../models/solutions";

import { PuzzleActions } from "./usePlayPuzzleActions";

import SelectableCell from "./SelectableCell";

type PuzzlePanelProps = {
  actions: PuzzleActions;
  size: number;
};

const PuzzlePanel = ({ actions, size }: PuzzlePanelProps): JSX.Element => {
  const sets = actions.previewed?.sets;
  const selected = actions.previewed ? null : actions.selected;
  const highlighted =
    sets?.size === 1 ? sets.values().next().value : actions.highlighted;

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
                    borders={getBorders(cell, actions.previewed)}
                    colors={getColors(cell, actions.previewed)}
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

const NO_BORDERS = [false, false, false, false];

function getBorders(
  cell: Cell,
  move: Move | null
): [boolean, boolean, boolean, boolean] {
  let borders = NO_BORDERS;

  if (move?.groups.size) {
    for (const g of move.groups) {
      const next = g.borders.get(cell);

      if (next) {
        borders = [
          borders[0] || next[0],
          borders[1] || next[1],
          borders[2] || next[2],
          borders[3] || next[3],
        ];
      }
    }
  }

  return borders as [boolean, boolean, boolean, boolean];
}

function getColors(
  cell: Cell,
  move: Move | null
): { [key: string]: Set<Known> } {
  if (!move) {
    return {};
  }

  const clues = move.clues.get(cell);
  const set = move.sets.get(cell);
  const marks = move.marks.get(cell);

  return {
    green: set
      ? clues
        ? new Set([set, ...clues])
        : new Set([set])
      : clues
      ? clues
      : new Set(),
    red: marks || new Set(),
  };
}

export default PuzzlePanel;
