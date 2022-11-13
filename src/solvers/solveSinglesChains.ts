import { ALL_KNOWNS } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { GRID, Cell } from "../models/grid";
import { Move, Strategy } from "../models/move";

import { difference, intersect, twoSetValues } from "../utils/collections";
import { MarkColor } from "../models/decoration";

const LOG = false;

/**
 * Looks for knowns group pairs forming chains where another cell
 * not in the chain can see two links in the chain,
 * and removes the known from that cell.
 *
 * Example: This shows a singles chain of 7 linking cells (E8, E2, F1, H1).
 *
 *     123456789
 *   A ·········
 *   B ·······7·
 *   C ·········
 *   D ·········
 *   E ·7·····7·  ←-- chain starts here because 7 appears 3 times in column 8
 *   F 7········
 *   G ·········
 *   H 7······77  ←-- remove 7 from cell H8
 *   J ······7··
 *
 * "..7.836.. .397.68.. 826419753 64.19.387 .8.367... .73.48.6. 39.87..26 7649..138 2.863.97."
 * "32.5479.6 ..6213.5. .4569823. 5..472... ..79.1.25 ..28.57.. 214359678 673184592 .5.726143"
 */
export default function solveSinglesChains(board: ReadableBoard): Move[] {
  const moves: Move[] = [];

  for (const k of ALL_KNOWNS) {
    LOG && console.info("[singles-chain] START", k);

    const candidates = new Set<Cell>();
    const nodes = new Set<Cell>();
    const edges = new Map<Cell, Set<Cell>>();

    for (const [_, groups] of GRID.groups) {
      for (const [_, group] of groups) {
        const cells = board.getCandidateCells(group, k);

        if (cells.size === 2) {
          const [first, second] = twoSetValues(cells);
          nodes.add(first);
          if (board.getCandidates(first).size > 1) {
            candidates.add(first);
          }
          nodes.add(second);
          if (board.getCandidates(second).size > 1) {
            candidates.add(second);
          }

          LOG &&
            console.info(
              "[singles-chain]",
              group.name,
              "pair",
              Cell.stringFromPoints(cells)
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
        } else if (cells.size) {
          LOG &&
            console.info(
              "[singles-chain]",
              group.name,
              "candidates",
              Cell.stringFromPoints(cells)
            );

          for (const c of cells) {
            if (board.getCandidates(c).size > 1) {
              candidates.add(c);
            }
          }
        }
      }
    }

    LOG &&
      console.info(
        "[singles-chain] CANDIDATES",
        Cell.stringFromPoints(candidates),
        "NODES",
        Cell.stringFromPoints(nodes)
      );

    const found = new Map<Cell, Map<Cell, MarkColor>>();
    const ignore = new Set<Cell>();

    // for each cell in candidate pool
    for (const candidate of candidates) {
      const sees = intersect(nodes, candidate.neighbors);

      LOG && console.info("[singles-chain] CHECK", candidate.key);

      const chain = new Chain(candidate);
      const stack = [Array.from(sees)];
      let shortest = 1000;

      while (stack.length) {
        LOG &&
          console.info(
            "[singles-chain] STEP",
            candidate.key,
            Cell.stringFromPoints(chain.nodes, false),
            "stack",
            `[ ${stack
              .map((pool) => Cell.stringFromPoints(new Set(pool)))
              .join(" ")} ]`
          );

        const pool = stack[stack.length - 1]!;
        if (!pool.length || chain.nodes.size + 1 >= shortest) {
          if (chain.nodes.size) {
            LOG && console.info("[singles-chain] BACKTRACK");

            chain.pop();
          }

          stack.pop();
          continue;
        }

        const node = pool.pop()!;
        if (node === candidate || chain.contains(node)) {
          LOG &&
            console.info(
              "[singles-chain] SKIP",
              candidate.key,
              "dupe",
              node.key
            );

          continue;
        }

        chain.push(node);
        if (sees.has(node) && chain.mismatched()) {
          if (chain.allNodesInSameBlock()) {
            LOG &&
              console.info(
                "[singles-chain] IGNORE",
                candidate.key,
                "Box Line Reduction",
                Cell.stringFromPoints(chain.nodes, false)
              );

            ignore.add(candidate);
            found.delete(candidate);

            break;
          }

          LOG &&
            console.info(
              "[singles-chain] FOUND",
              candidate.key,
              Cell.stringFromPoints(chain.nodes, false)
            );

          shortest = chain.nodes.size;
          found.set(candidate, new Map(chain.colors));

          chain.pop();
          // stack.pop();
          continue;
        }

        const next = difference(edges.get(node)!, chain.nodes);
        if (next.has(candidate)) {
          next.delete(candidate);
        }

        if (next.size) {
          LOG && console.info("[singles-chain] EXTEND", node.key);

          stack.push(Array.from(next));
        } else {
          // pushed above to check chain, not extending same as finding empty pool
          chain.pop();
        }
      }
    }

    for (const [cell, colors] of found) {
      const move = Move.start(Strategy.SinglesChain).mark(cell, k);

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
  end?: Cell;
  color: MarkColor = "yellow";

  constructor(candidate: Cell) {
    this.candidate = candidate;
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
    if (!this.end) {
      console.error("[singles-chain] cannot pop() empty chain");
      return;
    }

    this.stack.pop();
    this.color = opposite(this.color);
    this.nodes.delete(this.end);
    this.colors.delete(this.end);
    this.end = this.stack[this.stack.length - 1];
  }
}
