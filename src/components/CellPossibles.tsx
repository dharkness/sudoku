import { Known, known } from "../models/basics";

const PENCIL = "·";

type CellPencilMarksProps = {
  possibles: Set<Known>;
};

const CellPossibles = ({ possibles }: CellPencilMarksProps): JSX.Element => {
  return (
    <table className="h-full w-full">
      {[0, 1, 2].map((r) => (
        <tr key={r}>
          {[0, 1, 2].map((c) => {
            const k = known(3 * r + c + 1);
            return (
              <td
                key={k}
                className="mx-auto"
                style={{ width: "33%", height: "33%" }}
              >
                {possibles.has(known(k)) ? PENCIL : ""}
              </td>
            );
          })}
        </tr>
      ))}
    </table>
  );
};

export default CellPossibles;
