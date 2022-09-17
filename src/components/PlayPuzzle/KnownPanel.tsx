import { known, UNKNOWN } from "../../models/basics";

import { PuzzleActions } from "./usePlayPuzzleActions";

type KnownPanelProps = {
  actions: PuzzleActions;
};

const KnownPanel = ({ actions }: KnownPanelProps): JSX.Element => {
  const { locked } = actions;

  return (
    <table
      className="table-fixed border border-collapse border-black text-center select-none cursor-pointer"
      style={{ width: 160, height: 160 }}
    >
      {[0, 1, 2].map((r) => (
        <tr key={r} className={`${r < 2 && "border-b"} border-slate-300`}>
          {[0, 1, 2].map((c) => {
            const k = known(3 * r + c + 1);

            return (
              <td
                key={k}
                className={`mx-auto ${
                  k === locked && "bg-emerald-50"
                } hover:bg-blue-500 ${c < 2 && "border-r"} border-slate-300`}
                style={{ width: "33%", height: "33%" }}
                onClick={() => actions.highlight(k === locked ? UNKNOWN : k)}
              >
                {k}
              </td>
            );
          })}
        </tr>
      ))}
    </table>
  );
};

export default KnownPanel;
