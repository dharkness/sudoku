import { ALL_KNOWNS } from "../models/basics";
import { BOARD, Cell } from "../models/board";
import { ReadableState } from "../models/state";
import { MarkColor, Move, Strategy } from "../models/solutions";

import { difference, intersect, twoSetValues } from "../utils/collections";

const LOG = false;

/**
 * Looks for knowns group pairs forming chains where another cell
 * not in the chain can see two links in the chain,
 * and removes the known from that cell.
 *
 * Example: This shows a singles chain of 7 linking cells (58, 52, 61, 81).
 *
 *     123456789
 *   1 ·········
 *   2 ·······7·
 *   3 ·········
 *   4 ·········
 *   5 ·7·····7·  ←-- chain starts here because 7 appears 3 times in column 8
 *   6 7········
 *   7 ·········
 *   8 7······77  ←-- remove 7 from cell 88
 *   9 ······7··
 *
 * "..7.836.. .397.68.. 826419753 64.19.387 .8.367... .73.48.6. 39.87..26 7649..138 2.863.97."
 */
export default function solveSinglesChains(state: ReadableState): Move[] {
  const moves: Move[] = [];

  for (const k of ALL_KNOWNS) {
    LOG && console.info("[singles-chain] START", k);

    const candidates = new Set<Cell>();
    const nodes = new Set<Cell>();
    const edges = new Map<Cell, Set<Cell>>();

    for (const [_, groups] of BOARD.groups) {
      for (const [_, group] of groups) {
        const cells = state.getCandidateCells(group, k);

        if (cells.size === 2) {
          const [first, second] = twoSetValues(cells);
          nodes.add(first);
          nodes.add(second);

          LOG &&
            console.info(
              "[singles-chain] PAIR",
              group.name,
              first.point.k,
              second.point.k
            );

          [
            [first, second],
            [second, first],
          ].forEach(([start, end]) => {
            if (edges.has(start!)) {
              edges.get(start!)!.add(end!);
            } else {
              edges.set(start!, new Set([end!]));
            }
          });
        } else {
          LOG &&
            console.info(
              "[singles-chain] CANDIDATES",
              group.name,
              Cell.stringFromPoints(cells)
            );

          for (const c of cells) {
            if (state.getCandidates(c).size > 1) {
              candidates.add(c);
            }
          }
        }
      }
    }

    const found = new Map<Cell, Map<Cell, MarkColor>>();
    const ignore = new Set<Cell>();

    // for each cell in candidate pool
    for (const candidate of candidates) {
      const sees = intersect(nodes, candidate.neighbors);

      LOG &&
        console.info(
          "[singles-chain] CANDIDATE",
          candidate.point.k,
          "sees",
          Cell.stringFromPoints(sees)
        );

      for (const start of sees) {
        const chain = new Chain(candidate, start);
        const stack = [[...edges.get(start)!]];

        LOG &&
          console.info(
            "[singles-chain] CHECK",
            candidate.point.k,
            "start",
            start.point.k
          );

        while (stack.length) {
          const pool = stack[stack.length - 1]!;

          LOG &&
            console.info(
              "[singles-chain] CHECK",
              candidate.point.k,
              "stack",
              stack.length,
              "pool",
              Cell.stringFromPoints(new Set(pool))
            );

          if (!pool.length) {
            chain.pop();
            stack.pop();
            continue;
          }

          const node = pool.pop()!;
          if (node === candidate || chain.contains(node)) {
            continue;
          }

          chain.push(node);
          if (sees.has(node) && chain.mismatched()) {
            if (chain.allNodesInSameBlock()) {
              LOG &&
                console.info(
                  "[singles-chain] IGNORE",
                  candidate.point.k,
                  "degenerate",
                  Cell.stringFromPoints(chain.nodes)
                );

              ignore.add(candidate);
              found.delete(candidate);

              break;
            }
            if (
              !chain.allNodesInSameBlock() &&
              (!found.has(candidate) ||
                chain.colors.size < found.get(candidate)!.size)
            ) {
              LOG &&
                console.info(
                  "[singles-chain] FOUND",
                  candidate.point.k,
                  "chain",
                  Cell.stringFromPoints(chain.nodes)
                );

              found.set(candidate, new Map(chain.colors));
            }

            chain.pop();
            stack.pop();
            continue;
          }

          const next = difference(edges.get(node)!, chain.nodes);
          if (next.size) {
            LOG &&
              console.info(
                "[singles-chain] EXTEND",
                candidate.point.k,
                "nodes",
                Cell.stringFromPoints(next)
              );

            stack.push([...next]);
          } else {
            // pushed above to check chain, not extending same as finding empty pool
            chain.pop();
          }
        }
      }
    }

    for (const [cell, colors] of found) {
      const move = new Move(Strategy.SinglesChain).mark(cell, k);

      for (const [c, color] of colors) {
        move.clue(c, k, color);
      }

      moves.push(move);
    }
  }

  return moves;
}

const opposite = (c: MarkColor): MarkColor =>
  c === "green" ? "yellow" : "green";

class Chain {
  readonly candidate: Cell;
  readonly nodes = new Set<Cell>();
  readonly colors = new Map<Cell, MarkColor>();

  readonly stack: Cell[] = [];
  readonly start: Cell;
  end: Cell;
  color: MarkColor = "green";

  constructor(candidate: Cell, start: Cell) {
    this.candidate = candidate;
    this.nodes.add(start);
    this.colors.set(start, this.color);

    this.stack.push(start);
    this.start = start;
    this.end = start;
  }

  mismatched(): boolean {
    return this.color !== "green";
  }

  allNodesInSameBlock(): boolean {
    let block;

    for (const n of this.nodes) {
      if (block) {
        if (block !== n.block) {
          return false;
        }
      } else {
        block = n.block;
      }
    }

    return true;
  }

  contains(node: Cell): boolean {
    return this.nodes.has(node);
  }

  push(node: Cell): void {
    this.color = opposite(this.color);
    this.end = node;

    this.nodes.add(node);
    this.colors.set(node, this.color);
    this.stack.push(node);
  }

  pop(): void {
    const node = this.stack.pop();

    if (!node) {
      console.error("[singles-chain] cannot pop() empty chain");
      return;
    }

    this.color = opposite(this.color);
    this.nodes.delete(node);
    this.colors.delete(node);
    this.end = this.stack[this.stack.length - 1]!;
  }
}
