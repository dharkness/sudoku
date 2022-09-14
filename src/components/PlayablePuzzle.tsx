import { useMemo, useState } from "react";

import useEventListener from "@use-it/event-listener";

import {
  ALL_COORDS,
  getPoint,
  known,
  Point,
  coord,
  Known,
  UNKNOWN,
} from "../models/basics";
import { BOARD } from "../models/board";
import { WritableState } from "../models/state";

import SelectableCell from "./SelectableCell";
import { singleSetValue } from "../utils/collections";

type EditablePuzzleProps = {
  state: WritableState;
  setCell: (point: Point, known: Known) => void;
  removePossible: (point: Point, known: Known) => void;
  undo: () => void;
  redo: () => void;
  size: number;
};

const PlayablePuzzle = ({
  state,
  setCell,
  removePossible,
  undo,
  redo,
  size,
}: EditablePuzzleProps): JSX.Element => {
  const [selected, setSelected] = useState<Point>();

  const [highlight, singleton] = useMemo(() => {
    if (!selected) {
      return [UNKNOWN, UNKNOWN];
    }

    const highlight = BOARD.getValue(state, selected);
    const possibles = BOARD.getPossibles(state, selected);
    const singleton =
      possibles.size === 1 ? singleSetValue(possibles) : UNKNOWN;

    return [highlight, singleton];
  }, [state, selected]);

  useEventListener("keydown", (event: KeyboardEvent) => {
    // noinspection JSDeprecatedSymbols
    if (
      event.ctrlKey ||
      event.altKey ||
      event.isComposing ||
      event.keyCode === 229
    ) {
      return;
    }

    const key = event.key;

    switch (key) {
      case "u":
      case "Home":
        setSelected(getPoint(coord(0, "row"), coord(0, "col")));
        event.preventDefault();
        return;
      case "o":
      case "End":
        setSelected(getPoint(coord(8, "row"), coord(8, "col")));
        event.preventDefault();
        return;
      case "z":
        undo();
        event.preventDefault();
        return;
      case "y":
        redo();
        event.preventDefault();
        return;
    }

    if (selected) {
      if (key === " " || key === "Spacebar") {
        if (singleton !== UNKNOWN) {
          setCell(selected, singleton);
        }
      } else if ("1" <= key && key <= "9") {
        setCell(selected, known(key.charCodeAt(0) - ZERO_CODE));
      } else if (key in SET_KNOWN_KEYS) {
        setCell(selected, SET_KNOWN_KEYS[key]!);
      } else if (key in REMOVE_POSSIBLE_KEYS) {
        removePossible(selected, REMOVE_POSSIBLE_KEYS[key]!);
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
            if (selected.c < 8) {
              setSelected(getPoint(selected.r, coord(selected.c + 1, "col")));
            }
            break;
          default:
            console.log("ignoring keydown", event);
            return;
        }
      }
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
                  highlight={highlight}
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

const SET_KNOWN_KEYS: { [key: string]: Known } = {
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

const REMOVE_POSSIBLE_KEYS: { [key: string]: Known } = {
  W: 1,
  E: 2,
  R: 3,
  S: 4,
  D: 5,
  F: 6,
  X: 7,
  C: 8,
  V: 9,
};

export default PlayablePuzzle;
