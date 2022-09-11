import { useState } from "react";

import useEventListener from "@use-it/event-listener";

import {
  Value,
  ALL_COORDS,
  getPoint,
  known,
  Point,
  coord,
  Known,
} from "../models/basics";
import { BOARD } from "../models/board";
import { WritableState } from "../models/state";

import SelectableCell from "./SelectableCell";
import { printAllPossibles } from "../models/printers";

type EditablePuzzleProps = {
  state: WritableState;
  setCell: (point: Point, value: Value) => void;
  size: number;
};

const PlayablePuzzle = ({
  state,
  setCell,
  size,
}: EditablePuzzleProps): JSX.Element => {
  const [selected, setSelected] = useState<Point>();

  printAllPossibles(state);

  useEventListener("keydown", (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    const key = event.key;
    if (selected) {
      if ("1" <= key && key <= "9") {
        setCell(selected, known(key.charCodeAt(0) - ZERO_CODE));
      } else if (key in NUMBER_KEYS) {
        setCell(selected, NUMBER_KEYS[key]!);
      } else if (["Backspace", "Delete", "Clear"].includes(key)) {
        // TODO how to clear?
      } else {
        switch (key) {
          case "i":
          case "Up":
          case "ArrowUp":
            if (selected.r > 0) {
              setSelected(getPoint(coord(selected.r - 1, "row"), selected.c));
            }
            break;
          case "k":
          case "Down":
          case "ArrowDown":
            if (selected.r < 8) {
              setSelected(getPoint(coord(selected.r + 1, "row"), selected.c));
            }
            break;
          case "j":
          case "Left":
          case "ArrowLeft":
            if (selected.c > 0) {
              setSelected(getPoint(selected.r, coord(selected.c - 1, "col")));
            }
            break;
          case "l":
          case "Right":
          case "ArrowRight":
            if (selected.r < 8) {
              setSelected(getPoint(selected.r, coord(selected.c + 1, "col")));
            }
            break;
        }
      }
    }

    switch (key) {
      case "u":
      case "Home":
        setSelected(getPoint(coord(0, "row"), coord(0, "col")));
        break;
      case "o":
      case "End":
        setSelected(getPoint(coord(8, "row"), coord(8, "col")));
        break;
    }

    event.preventDefault();
  });

  return (
    <table className="table-fixed border border-collapse border-black text-center">
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
                  value={BOARD.getValue(state, point)}
                  selected={selected === point}
                  onSelect={() => setSelected(point)}
                  size={size}
                  className={""}
                  possibles={BOARD.getPossibles(state, point)}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ZERO_CODE = "0".charCodeAt(0);

const NUMBER_KEYS: { [key: string]: Known } = {
  w: 1,
  e: 2,
  r: 3,
  s: 4,
  d: 5,
  f: 6,
  x: 7,
  c: 8,
  v: 9,
};

export default PlayablePuzzle;
