import clsx from "clsx";

import { Point, Value, Known, UNKNOWN } from "../models/basics";

import CellPossibles from "./CellPossibles";

type SelectableCellProps = {
  point: Point;
  value: Value;
  possibles: Set<Known>;

  selected: boolean;
  onSelect: () => void;

  className?: string;
  size: number;
};

const SelectableCell = ({
  point,
  value,
  possibles,
  selected,
  onSelect,
  className,
  size,
}: SelectableCellProps): JSX.Element => {
  const classes = clsx(
    className,
    "mx-auto",
    selected && "bg-slate-200",
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
        <CellPossibles possibles={possibles} />
      ) : (
        <span style={{ fontSize: "2em" }}>{value}</span>
      )}
    </td>
  );
};

export default SelectableCell;