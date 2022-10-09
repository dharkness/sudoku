import useEventListener from "@use-it/event-listener";

import { coord, getPoint, Known, known, UNKNOWN } from "../../models/basics";
import { GRID } from "../../models/grid";

import { PuzzleActions } from "./usePlayPuzzleActions";

export default function usePlayPuzzleKeys(actions: PuzzleActions) {
  const { locked, selected, singleton } = actions;

  useEventListener("keydown", (event: KeyboardEvent) => {
    // noinspection JSDeprecatedSymbols
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    const { altKey, ctrlKey, key } = event;

    if (altKey) {
      if (key === "0") {
        actions.highlight(UNKNOWN);
      } else if ("1" <= key && key <= "9") {
        const k = known(key.charCodeAt(0) - ZERO_CODE);
        console.log(k, "=", locked);
        actions.highlight(k === locked ? UNKNOWN : k);
      } else if (key in SET_KNOWN_KEYS) {
        const k = SET_KNOWN_KEYS[key]!;
        actions.highlight(k === locked ? UNKNOWN : k);
      } else {
        return;
      }

      event.preventDefault();
      return;
    }

    switch (key) {
      case "q":
        actions.reset();
        event.preventDefault();
        return;
      case "z":
        actions.undo();
        event.preventDefault();
        return;
      case "y":
        actions.redo();
        event.preventDefault();
        return;
    }

    if (selected) {
      if (key === " " || key === "Spacebar") {
        if (singleton !== UNKNOWN) {
          actions.setCell(singleton);
        }
      } else if (!ctrlKey && "1" <= key && key <= "9") {
        actions.setCell(known(key.charCodeAt(0) - ZERO_CODE));
      } else if (!ctrlKey && key in SET_KNOWN_KEYS) {
        actions.setCell(SET_KNOWN_KEYS[key]!);
      } else if (!ctrlKey && key in REMOVE_CANDIDATE_KEYS) {
        actions.removeCandidate(REMOVE_CANDIDATE_KEYS[key]!);
      } else if (!ctrlKey && ["Backspace", "Delete", "Clear"].includes(key)) {
        // TODO how to clear?
      } else {
        switch (key) {
          case "u":
          case "Home":
            actions.select(
              GRID.getCell(getPoint(ctrlKey ? 0 : selected.point.r, 0))
            );
            event.preventDefault();
            return;
          case "o":
          case "End":
            actions.select(
              GRID.getCell(getPoint(ctrlKey ? 8 : selected.point.r, 8))
            );
            event.preventDefault();
            return;

          case "y":
          case "PageUp":
            actions.select(GRID.getCell(getPoint(0, selected.point.c)));
            event.preventDefault();
            return;
          case "h":
          case "PageDown":
            actions.select(GRID.getCell(getPoint(8, selected.point.c)));
            event.preventDefault();
            return;

          case "i":
          case "Up":
          case "ArrowUp":
            if (selected.point.r > 0) {
              actions.select(
                GRID.getCell(
                  getPoint(
                    ctrlKey ? 0 : coord(selected.point.r - 1, "row"),
                    selected.point.c
                  )
                )
              );
            }
            break;
          case "k":
          case "Down":
          case "ArrowDown":
            if (selected.point.r < 8) {
              actions.select(
                GRID.getCell(
                  getPoint(
                    ctrlKey ? 8 : coord(selected.point.r + 1, "row"),
                    selected.point.c
                  )
                )
              );
            }
            break;
          case "j":
          case "Left":
          case "ArrowLeft":
            if (selected.point.c > 0) {
              actions.select(
                GRID.getCell(
                  getPoint(
                    selected.point.r,
                    ctrlKey ? 0 : coord(selected.point.c - 1, "col")
                  )
                )
              );
            }
            break;
          case "l":
          case "Right":
          case "ArrowRight":
            if (selected.point.c < 8) {
              actions.select(
                GRID.getCell(
                  getPoint(
                    selected.point.r,
                    ctrlKey ? 8 : coord(selected.point.c + 1, "col")
                  )
                )
              );
            }
            break;

          default:
            console.log("ignoring keydown", event);
            return;
        }
      }
    } else {
      switch (key) {
        case "u":
        case "Home":
          actions.select(GRID.getCell(getPoint(0, 0)));
          event.preventDefault();
          return;
        case "o":
        case "End":
          actions.select(GRID.getCell(getPoint(8, 8)));
          event.preventDefault();
          return;
      }
    }

    if (!ctrlKey) {
      event.preventDefault();
    }
  });
}

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

const REMOVE_CANDIDATE_KEYS: { [key: string]: Known } = {
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
