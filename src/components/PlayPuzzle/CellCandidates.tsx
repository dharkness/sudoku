import { Known, known, Value } from "../../models/basics";

type CellCandidatesProps = {
  candidates: Set<Known>;
  highlighted: Value;
  showNumber?: boolean;
};

const CellCandidates = ({
  candidates,
  highlighted,
  showNumber,
}: CellCandidatesProps): JSX.Element => {
  return (
    <table className="h-full w-full text-sm">
      {[0, 1, 2].map((r) => (
        <tr key={r}>
          {[0, 1, 2].map((c) => {
            const k = known(3 * r + c + 1);
            const candidate = candidates.has(k);

            return (
              <td
                key={k}
                className={`mx-auto ${
                  candidate && k === highlighted && "bg-emerald-50"
                }`}
                style={{ width: "33%", height: "33%" }}
              >
                {candidate ? (showNumber ? k : PENCIL) : ""}
              </td>
            );
          })}
        </tr>
      ))}
    </table>
  );
};

const PENCIL = "•";

export default CellCandidates;
