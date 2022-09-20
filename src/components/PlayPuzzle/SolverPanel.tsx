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

        const moves = solve(current);

        return { key, label, disabled: !moves.length, moves };
      })
      .filter(Boolean) as Solution[];
  }, [current]);

  return (
    <div className="flex flex-col gap-10">
      {solutions.map(({ key, label, disabled, moves }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => actions.applyMoves(moves)}
          className={disabled ? disabledClasses : enabledClasses}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const buttons = {
  singletons: "Singletons",
  nakedPairs: "Naked Pairs",
  nakedTriples: "Naked Triples",
  hiddenPairs: "Hidden Pairs",
  hiddenTriples: "Hidden Triples",
  xWings: "X-Wings",
  singlesChains: "Singles Chains",
  bruteForce: "Brute Force",
};

const enabledClasses =
  "px-6 py-2 text-lg text-blue-100 transition-colors duration-300 bg-blue-500 rounded-full shadow-xl hover:bg-blue-600 shadow-blue-400/30";
const disabledClasses =
  "px-6 py-2 text-lg bg-slate-500 rounded-full shadow-xl shadow-slate-400/30";

export default SolverPanel;
