import clsx from "clsx";

import { Point, Value, Known, UNKNOWN } from "../../models/basics";

import CellCandidates from "./CellCandidates";

type SelectableCellProps = {
  point: Point;
  given: Value;
  value: Value;
  candidates: Set<Known>;

  highlighted: Value;
  borders: [boolean, boolean, boolean, boolean];
  colors: { [key: string]: Set<Known> };
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
  borders,
  colors,
  selected,
  onSelect,
  className,
  size,
}: SelectableCellProps): JSX.Element => {
  const [top, right, bottom, left] = borders;
  const solvedBackgroundColor =
    value === UNKNOWN
      ? null
      : given === UNKNOWN
      ? "bg-neutral-300"
      : "bg-black";

  const classes = clsx(
    className,
    "mx-auto",
    selected
      ? "bg-sky-400"
      : highlighted === UNKNOWN
      ? solvedBackgroundColor
      : highlighted === value
      ? "bg-sky-900"
      // : candidates.has(highlighted)
      // ? "bg-emerald-50"
      : solvedBackgroundColor,
    given !== UNKNOWN && "text-red-400",
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

export default SelectableCell;
