import { Known } from "../models/basics";
import { ReadableBoard } from "../models/board";
import { MarkColor } from "../models/decoration";
import { Cell, GRID } from "../models/grid";
import { Move, Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import {
  deepPush,
  distinctPairs,
  excluding,
  hasAny,
  including,
  singleValue,
  twoValues,
  union,
} from "../utils/collections";

const LOG = false;

/**
 * Yadda yadda yadda...
 *
 * Example:
 *
 * TODO Track shortest chains per cell?
 * TODO Ignore if all nodes are in one group (naked triple/quad)
 *
 * ".8.1.3.7. .9.5.6... ..14.8.2. 578241639 143659782 926837451 .379.52.. ...3.4.97 419782.6."
 * ".92...376 .1..3.5.. 3.....19. 93.85.7.1 ...3.4... 2...97..3 689..341. 523.4..6. 147...23."
 * "..3..1... 8........ .51..9.6. .8....29. ...7...8. 2...4.5.3 6..9..... ..2.84... 41..5.6.."
 *
 * @link https://www.sudokuwiki.org/XY_Chains
 */
export default function solveXYChains(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();
  const possibles = new Map<string, [Chain, Move]>();

  try {
    const nodes = collectCellsWithTwoCandidates(board); // need to map by cell?
    const nodesByKnown = groupNodesByKnown(nodes);
    const linksByKnown = createLinks(board, nodesByKnown);

    for (const [candidate, links] of linksByKnown) {
      LOG && console.info("[xy-chains] START", candidate, links);

      const stack = links.map((link) => Chain.start(link));
      let chain;

      while ((chain = stack.shift())) {
        LOG && console.info("[xy-chains] CHAIN", chain);

        for (const link of chain.nextLinks()) {
          const next = chain.add(link);
          if (!next) {
            continue;
          }

          LOG && console.info("[xy-chains] ADD", next);

          stack.push(next);

          const move = next.createMove(board);

          if (move) {
            const key = move.key;

            if (possibles.has(key)) {
              const [c, _] = possibles.get(key)!;

              if (next.length() < c.length()) {
                possibles.set(key, [next, move]);
              }
            } else {
              possibles.set(key, [next, move]);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  for (const [_, [__, move]] of possibles) {
    moves.add(move as Move);
  }

  return moves;
}

class Node {
  readonly key: string;
  readonly cell: Cell;
  readonly candidates: Set<Known>;
  readonly otherCandidate = new Map<Known, Known>();
  readonly links = new Map<Known, Link[]>();

  constructor(cell: Cell, candidates: Set<Known>) {
    this.key = cell.key;
    this.cell = cell;
    this.candidates = candidates;

    const [first, second] = twoValues(candidates);
    this.otherCandidate.set(first, second).set(second, first);
    this.links.set(first, []);
    this.links.set(second, []);
  }

  add(shared: Known, link: Link) {
    this.links.get(shared)!.push(link);
  }

  colors(green: Known): Set<string> {
    const colors = new Set<string>();
    const other = this.otherCandidate.get(green)!;
    const greenKey = `${green}-G`;
    const otherKey = `${other}-Y`;

    for (const [_, group] of this.cell.groups) {
      colors.add(`${group.name}-${greenKey}`);
      colors.add(`${group.name}-${otherKey}`);
    }

    return colors;
  }
}

class Link {
  static create(from: Node, to: Node, strong: boolean, shared: Known): Link {
    return new Link(
      from,
      singleValue(excluding(from.candidates, shared)),
      to,
      singleValue(excluding(to.candidates, shared)),
      strong,
      shared
    );
  }

  readonly key: string;
  readonly from: Node;
  readonly fromCandidate: Known;
  readonly to: Node;
  readonly toCandidate: Known;
  readonly strong: boolean;
  readonly shared: Known;

  constructor(
    from: Node,
    fromCandidate: Known,
    to: Node,
    toCandidate: Known,
    strong: boolean,
    shared: Known
  ) {
    this.key = `${from.key}-${to.key}`;
    this.from = from;
    this.fromCandidate = fromCandidate;
    this.to = to;
    this.toCandidate = toCandidate;
    this.strong = strong;
    this.shared = shared;

    from.add(shared, this);
  }

  reversed(): Link {
    return new Link(
      this.to,
      this.toCandidate,
      this.from,
      this.fromCandidate,
      this.strong,
      this.shared
    );
  }

  colors(index: number): Set<string> {
    const colors = this.to.colors(this.shared);

    return index === 0
      ? union(this.from.colors(this.fromCandidate), colors)
      : colors;
  }
}

class Chain {
  static start(link: Link): Chain {
    return new this(
      link.key,
      link,
      link,
      [link],
      new Set([link.from, link.to]),
      link.colors(0)
    );
  }

  readonly key: string;
  readonly links: Link[];
  readonly first: Link;
  readonly last: Link;
  readonly nodes: Set<Node>;
  readonly colors: Set<string>;

  constructor(
    key: string,
    first: Link,
    last: Link,
    links: Link[],
    nodes: Set<Node>,
    colors: Set<string>
  ) {
    this.key = key;
    this.links = links;
    this.first = first;
    this.last = last;
    this.nodes = nodes;
    this.colors = colors;
  }

  length(): number {
    return this.nodes.size;
  }

  nextLinks(): Link[] {
    return this.last.to.links.get(this.last.toCandidate)!;
  }

  add(link: Link): Chain | null {
    if (this.nodes.has(link.to)) {
      LOG && console.info("[xy-chains] BLOCKED", this, link);

      return null;
    }

    const newColors = link.colors(this.links.length);

    if (hasAny(newColors, this.colors)) {
      LOG && console.info("[xy-chains] BLOCKED", this, link, newColors);

      return null;
    }

    return new Chain(
      `${this.key}-${link.to.key}`,
      this.first,
      link,
      [...this.links, link],
      including(this.nodes, link.to),
      union(this.colors, newColors)
    );
  }

  createMove(board: ReadableBoard): Move | null {
    if (this.length() < 4) {
      return null;
    }

    const candidate = this.first.fromCandidate;

    if (candidate !== this.last.toCandidate) {
      return null;
    }

    const cells = new Set<Cell>();
    const start = this.first.from.cell;
    const end = this.last.to.cell;

    for (const cell of start.commonNeighbors.get(end)!) {
      if (board.getCandidates(cell).has(candidate)) {
        cells.add(cell);
      }
    }

    if (!cells.size) {
      return null;
    }

    const move = Move.start(Strategy.XYChains)
      .clue(start, this.first.fromCandidate, "green")
      .clue(start, this.first.shared, "yellow")
      .mark(cells, candidate);

    let color: MarkColor = "yellow";
    for (const link of this.links) {
      color = opposite(color);
      move.clue(link.to.cell, link.shared, color);
      color = opposite(color);
      move.clue(link.to.cell, link.toCandidate, color);
    }

    move.clue(end, candidate, color);

    LOG && console.info("[xy-chains] FOUND", move);

    return move;
  }
}

const opposite = (c: MarkColor): MarkColor =>
  c === "green" ? "yellow" : "green";

function collectCellsWithTwoCandidates(board: ReadableBoard): Node[] {
  const nodes: Node[] = [];

  for (const cell of GRID.cells.values()) {
    const candidates = board.getCandidates(cell);

    if (candidates.size === 2) {
      nodes.push(new Node(cell, candidates));
    }
  }

  return nodes;
}

/**
 * Groups all nodes by their candidates into layers, one per candidate.
 * Since every node has two candidates, each node will appear in two layers.
 */
function groupNodesByKnown(nodes: Node[]): Map<Known, Node[]> {
  const grouped = new Map<Known, Node[]>();

  for (const node of nodes) {
    for (const k of node.candidates) {
      if (grouped.has(k)) {
        grouped.get(k)!.push(node);
      } else {
        grouped.set(k, [node]);
      }
    }
  }

  return grouped;
}

/**
 * Creates a link for every pair of nodes that see each other on the same layer.
 */
function createLinks(
  board: ReadableBoard,
  layers: Map<Known, Node[]>
): Map<Known, Link[]> {
  const links = new Map<Known, Link[]>();

  for (const [k, layer] of layers) {
    for (const nodes of distinctPairs(layer)) {
      const [first, second] = nodes;
      if (!first.cell.sees(second.cell)) {
        continue;
      }

      const groups = first.cell.commonGroups(second.cell);
      let strong = false;

      for (const group of groups) {
        if (board.getCandidateCells(group, k).size === 2) {
          strong = true;
          break;
        }
      }

      const link = Link.create(first, second, strong, k);

      deepPush(links, link, link.fromCandidate);
      deepPush(links, link.reversed(), link.toCandidate);
    }
  }

  return links;
}
