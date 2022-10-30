import { useMemo } from "react";

import { Move } from "../../models/solutions";
import solvers from "../../solvers";

import { PuzzleActions } from "./usePlayPuzzleActions";

type SolverPanelProps = {
  actions: PuzzleActions;
};

type Solution = {
  key: string;
  label: string;
  disabled: boolean;
  moves: Move[];
};

const SolverPanel = ({ actions }: SolverPanelProps): JSX.Element => {
  const { current } = actions;

  const solutions = useMemo(() => {
    return Object.entries(buttons)
      .map(([key, label]) => {
        const solve = solvers[key];
        if (!solve) {
          return null;
        }

        const start = performance.now();
        const moves = solve(current);
        const time = performance.now() - start;

        console.info("[solver]", label, time.toLocaleString(), "ms", moves);

        return { key, label, disabled: !moves.length, moves };
      })
      .filter(Boolean) as Solution[];
  }, [current]);

  return (
    <div className="flex flex-col gap-5">
      {solutions.map(({ key, label, disabled, moves }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => actions.applyMoves(moves)}
          onMouseEnter={() => actions.preview(moves[0] || null)}
          onMouseLeave={() => actions.preview(null)}
          className={disabled ? disabledClasses : enabledClasses}
        >
          <div className="flex flex-row justify-between gap-5">
            <span>{label}</span>
            <span style={{ minWidth: 20 }}>{moves.length || null}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

const buttons = {
  nakedSingles: "Naked Singles",
  hiddenSingles: "Hidden Singles",
  intersectionRemovals: "Intersection Removals",
  nakedPairs: "Naked Pairs",
  nakedTriples: "Naked Triples",
  nakedQuads: "Naked Quads",
  hiddenPairs: "Hidden Pairs",
  hiddenTriples: "Hidden Triples",
  hiddenQuads: "Hidden Quads",
  xWings: "X-Wings",
  singlesChains: "Singles Chains",
  yWings: "Y-Wings",
  swordfish: "Swordfish",
  xyzWings: "XYZ-Wings",
  jellyfish: "Jellyfish",
  emptyRectangles: "Empty Rectangles",
  uniqueRectangles: "Unique Rectangles",
  // bruteForce: "Brute Force",
};

const enabledClasses =
  "px-6 py-2 text-lg text-blue-100 transition-colors duration-300 bg-blue-500 rounded-full shadow-xl hover:bg-blue-600 shadow-blue-400/30";
const disabledClasses =
  "px-6 py-2 text-lg bg-slate-500 rounded-full shadow-xl shadow-slate-400/30";

export default SolverPanel;
