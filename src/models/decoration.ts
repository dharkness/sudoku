import { Known, UNKNOWN, Value } from "./basics";

export type CellColor = "clue" | "mark" | "set";
export type MarkColor = "blue" | "green" | "yellow" | "red";

export type Borders = [boolean, boolean, boolean, boolean];

export const NO_BORDERS: Borders = [false, false, false, false];
export const FULL_BORDERS: Borders = [true, true, true, true];

export type Decoration = {
  borders: Borders;
  background: CellColor | null;
  colors: Map<Known, MarkColor>;
  set: Value;
};

export const EMPTY_DECORATION = {
  borders: NO_BORDERS,
  background: null,
  colors: new Map(),
  set: UNKNOWN,
};
