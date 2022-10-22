import { Known, known, Value } from "../../models/basics";
import { MarkColor } from "../../models/solutions";

type CellCandidatesProps = {
  candidates: Set<Known>;
  highlighted: Value;
  colors: Map<Known, MarkColor>;
  showNumber?: boolean;
};

const CellCandidates = ({
  candidates,
  highlighted,
  colors,
  showNumber,
}: CellCandidatesProps): JSX.Element => {
  return (
    <table className="h-full w-full text-sm">
      <tbody>
        {[0, 1, 2].map((r) => (
          <tr key={r}>
            {[0, 1, 2].map((c) => {
              const k = known(3 * r + c + 1);
              const candidate = candidates.has(k);
              const color =
                candidate && colors.has(k) ? Colors[colors.get(k)!] : null;

              return (
                <td key={k} className={`w-1/3 h-1/3 ${color && "m-auto"}`}>
                  {candidate ? (
                    color ? (
                      <div
                        className={`h-full w-full m-auto border rounded-full ${color}`}
                      >
                        {showNumber ? k : PENCIL}
                      </div>
                    ) : showNumber ? (
                      k
                    ) : (
                      PENCIL
                    )
                  ) : (
                    <div />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const PENCIL = "•";

const Colors = {
  blue: "bg-sky-900",
  green: "bg-emerald-100",
  yellow: "bg-yellow-200",
  red: "bg-red-200",
};

export default CellCandidates;
