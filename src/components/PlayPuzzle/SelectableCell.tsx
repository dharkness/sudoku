import clsx from "clsx";

import { Point, Value, Known, UNKNOWN } from "../../models/basics";
import { Decoration } from "../../models/solutions";

import CellCandidates from "./CellCandidates";

type SelectableCellProps = {
  point: Point;
  given: Value;
  value: Value;
  candidates: Set<Known>;

  highlighted: Value;
  decoration: Decoration;
  selected: boolean;
  onSelect: () => void;

  className?: string;
  size: number;
};

const SelectableCell = ({
  point,
  given,
  value,
  candidates,
  highlighted,
  decoration,
  selected,
  onSelect,
  className,
  size,
}: SelectableCellProps): JSX.Element => {
  const { background, borders, colors, set } = decoration;
  const [top, right, bottom, left] = borders;
  const backgroundColor = given
    ? "bg-black"
    : value
    ? "bg-neutral-300"
    : background
    ? BackgroundColors[background]
    : selected
    ? "bg-sky-400"
    : highlighted && highlighted === value
    ? "bg-sky-900"
    : highlighted && candidates.has(highlighted) // remove?
    ? "bg-emerald-50"
    : null;
  const color = given ? "text-red-400" : null;

  const classes = clsx(
    className,
    "mx-auto",
    backgroundColor,
    color,
    "border",
    top ? "border-t-2 border-t-yellow-400" : "border-t-black",
    right
      ? "border-r-2 border-r-yellow-400"
      : point.c % 3 === 2
      ? "border-r-black"
      : "border-r-slate-300",
    bottom
      ? "border-b-2 border-b-yellow-400"
      : point.r % 3 === 2
      ? "border-b-black"
      : "border-b-slate-300",
    left ? "border-l-2 border-l-yellow-400" : "border-l-black"
  );

  return (
    <td
      className={classes}
      style={{ width: size, height: size }}
      onClick={onSelect}
    >
      {value === UNKNOWN ? (
        <CellCandidates
          candidates={candidates}
          highlighted={selected ? UNKNOWN : highlighted}
          colors={colors}
          showNumber
        />
      ) : (
        <span style={{ fontSize: "2em" }}>{value}</span>
      )}
    </td>
  );
};

const BackgroundColors = {
  clue: "bg-neutral-300",
  mark: "bg-neutral-400",
  set: "bg-neutral-500",
};

export default SelectableCell;
