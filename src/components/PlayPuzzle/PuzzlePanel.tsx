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
                    highlighted={actions.highlighted}
                    borders={getBorders(cell, actions.previewed)}
                    colors={getColors(cell, actions.previewed)}
                    selected={actions.selected === point}
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

type Borders = [boolean, boolean, boolean, boolean];

const NO_BORDERS: Borders = [false, false, false, false];
const FULL_BORDERS: Borders = [true, true, true, true];

function getBorders(cell: Cell, move: Move | null): Borders {
  if (!move) {
    return NO_BORDERS;
  }

  if (move.groups.size) {
    return [...move.groups]
      .map((group) => group.borders.get(cell))
      .filter(Boolean)
      .reduce(
        // @ts-ignore
        (borders: Borders, next: Borders) =>
          [
            borders[0] || next[0],
            borders[1] || next[1],
            borders[2] || next[2],
            borders[3] || next[3],
          ] as Borders,
        NO_BORDERS
      ) as Borders;
  } else if (move.sets.size) {
    if (move.sets.has(cell) && 0 < move.sets.size && move.sets.size < 10) {
      return FULL_BORDERS;
    }
  } else if (move.clues.size || (0 < move.marks.size && move.marks.size < 10)) {
    if (move.clues.has(cell) || move.marks.has(cell)) {
      return FULL_BORDERS;
    }
  }

  return NO_BORDERS;
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
