import clsx from "clsx";

import { Known, UNKNOWN, Value } from "../../models/basics";
import { Cell } from "../../models/grid";

import CellCandidates, { ShowMarkNumber } from "./CellCandidates";
import { Decoration } from "../../models/decoration";

type SelectableCellProps = {
  cell: Cell;
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
  cell,
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
  const { background, borders, colors } = decoration;
  const [top, right, bottom, left] = borders;
  const backgroundColor = selected
    ? "bg-sky-400"
    : value
    ? highlighted === value
      ? "bg-sky-900"
      : given
      ? "bg-black"
      : "bg-neutral-300"
    : background
    ? BackgroundColors[background]
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
      : cell.point.c % 3 === 2
      ? "border-r-black"
      : "border-r-slate-300",
    bottom
      ? "border-b-2 border-b-yellow-400"
      : cell.point.r % 3 === 2
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
          showMarkNumber={ShowMarkNumber.Always}
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
