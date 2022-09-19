import { ALL_KNOWNS } from "../models/basics";
import { printCellCandidates } from "../models/printers";
import { ReadableState } from "../models/state";
import { Solutions } from "../models/solutions";
import { BOARD, Cell } from "../models/board";

import {
  difference,
  intersectMap,
  twoSetValues,
  union,
} from "../utils/collections";

const LOG = false;

type Color = 1 | 2;
const opposite = (c: Color): Color => (3 - c) as Color;

type Seen = Set<Cell>;
type Graph = Map<Cell, Color>;

/**
 * Looks for knowns group pairs forming chains where another cell
 * not in the chain can see two links in the chain,
 * and removes the known from that cell.
 *
 * TODO Switch cell/link for node/edge
 *
 * Example: This shows a singles chain of 7 linking cells (58, 52, 61, 81).
 *
 *     123456789
 *   1 ·········
 *   2 ·······7·
 *   3 ·········
 *   4 ·········
 *   5 ·7·····7·  ←-- chain starts here because 7 appears 3 times in column 8
 *   6 7········      if it did not appear in cell 28, it would form a loop,
 *   7 ·········      and you would not know which to remove
 *   8 7······7·  ←-- remove 7 from cell 88
 *   9 ·········
 */
export default function solveSinglesChains(
  state: ReadableState,
  solutions: Solutions
): void {
  // for each group,
  //   if two candidate cells,
  //     add new or to existing graph
  //   else
  //     add each cell to map of sets containing other "seen" cells
  // when adding graph, add to map of seeing cells
  //
  // each cell either
  //   is in one graph
  //   sees other cells and graphs
  //
  // at end, check each cell not in a graph if it sees any graphs
  //   intersectMap(seen(cell), graph)
  //     if map contains both colors, remove cell as candidate

  for (const k of ALL_KNOWNS) {
    const free = new Map<Cell, Seen>();
    const graphs = new Map<Cell, Graph>();

    for (const [_, groups] of BOARD.groups) {
      for (const [_, group] of groups) {
        const cells = state.getCandidateCells(group, k);

        if (cells.size === 2) {
          LOG && console.info("edge", k, Cell.stringFromPoints(cells));
          // add new graph, extend existing graph, or join two existing graphs
          const [start, end] = twoSetValues(cells);
          const startGraph = graphs.get(start);
          const endGraph = graphs.get(end);
          if (startGraph && endGraph) {
            if (startGraph === endGraph) {
              LOG &&
                console.info(
                  "loop",
                  Cell.stringFromPoints(new Set(startGraph.keys()))
                );
              // close loop on one graph
              // ..x....S  graph SxxE, SE forms a loop
              // ..x...E.
              const startColor = startGraph.get(start)!;
              const endColor = startGraph.get(end);
              if (endColor === startColor) {
                throw new LinkedCellsHaveSameColorError(startGraph, [
                  start,
                  end,
                ]);
              }
              // nothing to do; graphs with and without loops look identical
            } else {
              LOG &&
                console.info(
                  "join",
                  k,
                  Cell.stringFromPoints(new Set(startGraph.keys()))
                );
              // join two graphs
              // ..S....x  graphs Sx and Ex joined by SE
              // .E....x
              const startColor = startGraph.get(start)!;
              const endColor = endGraph.get(end);
              if (endColor === startColor) {
                // add cells of end to start with flipped colors
                for (const [cell, color] of endGraph) {
                  startGraph.set(cell, opposite(color));
                }
              } else {
                // add cells of end to start with same colors
                for (const [cell, color] of endGraph) {
                  startGraph.set(cell, color);
                }
              }
              // switch end graph to startGraph
              graphs.set(end, startGraph);
            }
          } else if (startGraph) {
            LOG &&
              console.info(
                "extend",
                k,
                Cell.stringFromPoints(new Set(startGraph.keys()))
              );
            // FACTOR Extract method for this and next block
            // extend graph from start to end
            const startColor = startGraph.get(start)!;
            startGraph.set(end, opposite(startColor));
            free.set(end, new Set());
            graphs.set(end, startGraph);
          } else if (endGraph) {
            LOG &&
              console.info(
                "extend",
                k,
                Cell.stringFromPoints(new Set(endGraph.keys()))
              );
            // extend graph from start to end
            const endColor = endGraph.get(end)!;
            endGraph.set(start, opposite(endColor));
            free.set(start, new Set());
            graphs.set(start, endGraph);
          } else {
            LOG && console.info("new", k, Cell.stringFromPoints(cells));
            // create new graph
            const graph = new Map<Cell, Color>([
              [start, 1],
              [end, 2],
            ]);
            graphs.set(start, graph);
            if (free.has(start)) {
              free.delete(start);
            }
            graphs.set(end, graph);
            if (free.has(end)) {
              free.delete(end);
            }
          }
        } else {
          // set free for each cell to the others in the set
          for (const c of cells) {
            const f = free.get(c);
            const others = difference(cells, new Set([c]));
            free.set(c, f ? union(f, others) : others);
          }
        }
      }
    }

    // check graphs against every free's seen
    for (const g of new Set(graphs.values())) {
      for (const [c, f] of free) {
        const sees = intersectMap(f, g);
        const unique = new Set(sees.values());
        if (unique.size === 2) {
          LOG && printCellCandidates(state, k);
          LOG &&
            console.info(
              "SOLVE SINGLES CHAIN",
              c.toString(),
              "x",
              k,
              "sees",
              Cell.stringFromPoints(new Set(sees.keys()))
            );
          solutions.addErasedPencil(c, k);
        }
      }
    }
  }
}

class LinkedCellsHaveSameColorError extends Error {
  public readonly graph: Graph;
  public readonly link: [Cell, Cell];

  constructor(graph: Graph, link: [Cell, Cell]) {
    super("Two linked cells in a graph may not have the same color");
    this.graph = graph;
    this.link = link;
  }
}
