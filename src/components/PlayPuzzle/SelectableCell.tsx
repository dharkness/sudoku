import clsx from "clsx";

import { Point, Value, Known, UNKNOWN } from "../../models/basics";

import CellPossibles from "./CellPossibles";

type SelectableCellProps = {
  point: Point;
  initial: Value;
  value: Value;
  possibles: Set<Known>;

  highlighted: Value;
  selected: boolean;
  onSelect: () => void;

  className?: string;
  size: number;
};

const SelectableCell = ({
  point,
  initial,
  value,
  possibles,
  highlighted,
  selected,
  onSelect,
  className,
  size,
}: SelectableCellProps): JSX.Element => {
  const solvedBackgroundColor =
    value === UNKNOWN
      ? null
      : initial === UNKNOWN
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
      : possibles.has(highlighted)
      ? "bg-emerald-50"
      : solvedBackgroundColor,
    initial !== UNKNOWN && "text-red-400",
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
        <CellPossibles
          possibles={possibles}
          highlighted={selected ? UNKNOWN : highlighted}
          pencilDot
        />
      ) : (
        <span style={{ fontSize: "2em" }}>{value}</span>
      )}
    </td>
  );
};

export default SelectableCell;
