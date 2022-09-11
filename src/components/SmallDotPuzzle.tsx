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
    <table className="table-fixed border border-collapse border-black text-center">
      <tbody>
        {rows.map((row, r) => (
          <tr
            key={r}
            className={r % 3 === 2 ? "border-b border-slate-500" : ""}
          >
            {row.split("").map((num, c) => (
              <td
                key={c}
                className={`mx-auto ${num === "." ? "" : "bg-black"} ${
                  c % 3 === 2 ? "border-r border-slate-500" : ""
                }`}
                style={{ width: size, height: size }}
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
