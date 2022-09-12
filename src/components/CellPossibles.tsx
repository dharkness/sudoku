import { Known, known, Value } from "../models/basics";

type CellPencilMarksProps = {
  possibles: Set<Known>;
  highlight: Value;
};

const CellPossibles = ({
  possibles,
  highlight,
}: CellPencilMarksProps): JSX.Element => {
  return (
    <table className="h-full w-full">
      {[0, 1, 2].map((r) => (
        <tr key={r}>
          {[0, 1, 2].map((c) => {
            const k = known(3 * r + c + 1);
            const possible = possibles.has(known(k));
            return (
              <td
                key={k}
                className={`mx-auto ${
                  possible && k === highlight && "bg-emerald-50"
                }`}
                style={{ width: "33%", height: "33%" }}
              >
                {possible ? k : ""}
              </td>
            );
          })}
        </tr>
      ))}
    </table>
  );
};

export default CellPossibles;
