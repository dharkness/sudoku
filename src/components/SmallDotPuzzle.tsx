import { Puzzle } from "../models/puzzle";

type SmallDotPuzzleProps = {
  puzzle: Puzzle;
  size: number;
  digits?: boolean;
};

const SmallDotPuzzle = ({
  puzzle,
  size,
  digits = false,
}: SmallDotPuzzleProps): JSX.Element => {
  const rows = puzzle.start.split(" ");

  return (
    <table
      className="table-fixed border border-collapse border-black text-center"
      style={{ width: size, height: size }}
    >
      <tbody>
        {rows.map((row, y) => (
          <tr
            key={y}
            className={y % 3 === 2 ? "border-b border-slate-500" : ""}
          >
            {row.split("").map((num, x) => (
              <td
                key={x}
                className={`mx-auto ${num === "." ? "" : "bg-black"} ${
                  x % 3 === 2 ? "border-r border-slate-500" : ""
                }`}
              >
                {digits && num !== "." ? num : ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SmallDotPuzzle;
