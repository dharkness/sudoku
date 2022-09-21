import clsx from "clsx";

import { Point, Value, Known, UNKNOWN } from "../../models/basics";

import CellCandidates from "./CellCandidates";

type SelectableCellProps = {
  point: Point;
  given: Value;
  value: Value;
  candidates: Set<Known>;

  highlighted: Value;
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
  selected,
  onSelect,
  className,
  size,
}: SelectableCellProps): JSX.Element => {
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
      : candidates.has(highlighted)
      ? "bg-emerald-50"
      : solvedBackgroundColor,
    given !== UNKNOWN && "text-red-400",
    "border-r",
    point.c % 3 === 2 ? "border-black" : "border-slate-300"
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
          showNumber
        />
      ) : (
        <span style={{ fontSize: "2em" }}>{value}</span>
      )}
    </td>
  );
};

export default SelectableCell;
