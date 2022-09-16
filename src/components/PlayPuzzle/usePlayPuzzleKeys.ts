import useEventListener from "@use-it/event-listener";

import { coord, getPoint, Known, known, UNKNOWN } from "../../models/basics";

import { PuzzleActions } from "./usePlayPuzzleActions";

export default function usePlayPuzzleKeys(actions: PuzzleActions) {
  const { selected, singleton } = actions;

  useEventListener("keydown", (event: KeyboardEvent) => {
    // noinspection JSDeprecatedSymbols
    if (event.altKey || event.isComposing || event.keyCode === 229) {
      return;
    }

    const { key, ctrlKey } = event;

    switch (key) {
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
      } else if (!ctrlKey && key in REMOVE_POSSIBLE_KEYS) {
        actions.removePossible(REMOVE_POSSIBLE_KEYS[key]!);
      } else if (!ctrlKey && ["Backspace", "Delete", "Clear"].includes(key)) {
        // TODO how to clear?
      } else {
        switch (key) {
          case "u":
          case "Home":
            actions.select(getPoint(ctrlKey ? 0 : selected.r, 0));
            event.preventDefault();
            return;
          case "o":
          case "End":
            actions.select(getPoint(ctrlKey ? 8 : selected.r, 8));
            event.preventDefault();
            return;

          case "y":
          case "PageUp":
            actions.select(getPoint(0, selected.c));
            event.preventDefault();
            return;
          case "h":
          case "PageDown":
            actions.select(getPoint(8, selected.c));
            event.preventDefault();
            return;

          case "i":
          case "Up":
          case "ArrowUp":
            if (selected.r > 0) {
              actions.select(
                getPoint(ctrlKey ? 0 : coord(selected.r - 1, "row"), selected.c)
              );
            }
            break;
          case "k":
          case "Down":
          case "ArrowDown":
            if (selected.r < 8) {
              actions.select(
                getPoint(ctrlKey ? 8 : coord(selected.r + 1, "row"), selected.c)
              );
            }
            break;
          case "j":
          case "Left":
          case "ArrowLeft":
            if (selected.c > 0) {
              actions.select(
                getPoint(selected.r, ctrlKey ? 0 : coord(selected.c - 1, "col"))
              );
            }
            break;
          case "l":
          case "Right":
          case "ArrowRight":
            if (selected.c < 8) {
              actions.select(
                getPoint(selected.r, ctrlKey ? 8 : coord(selected.c + 1, "col"))
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
          actions.select(getPoint(0, 0));
          event.preventDefault();
          return;
        case "o":
        case "End":
          actions.select(getPoint(8, 8));
          event.preventDefault();
          return;
      }
    }

    event.preventDefault();
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
