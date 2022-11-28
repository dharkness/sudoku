import { Known } from "../models/basics";
import {
  BoardErrors,
  CellChanges,
  CellError,
  cellsWithNCandidates,
  changes,
  GroupError,
  knownsWithNCandidates,
  ReadableBoard,
  SimpleBoard,
} from "../models/board";
import { MarkColor } from "../models/decoration";
import { Cell, Group } from "../models/grid";
import { Move, Moves } from "../models/move";
import { Strategy } from "../models/strategy";

import {
  deepAdd,
  deepPush,
  difference,
  differenceMap,
  intersectMap,
  intersectMapsOfSets,
  singleValue,
  twoValues,
  withoutEmptySets,
} from "../utils/collections";

const LOG = false;

/**
 * Builds a graph with two types of edges:
 *
 * - two remaining candidate cells for a known in a group
 * - two remaining candidates in a cell.
 *
 * Edges are connected by candidates to create a sprawling 3D Medusa graph.
 * Think of the XY plane as the first type of edges connecting cells
 * with the same candidate. The Z axis is the candidate value,
 * and the bi-value cells form edges between planes along it.
 *
 * Once this is completed, apply these six rules to find solved cells
 * or removed candidates.
 *
 * Rule 1
 *
 * Two candidates with the same color in the same cell.
 *
 * If the cell is a bi-value cell, this is an invalid position.
 * Otherwise, all nodes of the opposite color are solutions.
 *
 * ".9382456..856....22.6.75..8321769845...2583..578.4.29685..16723..7.8265...25.718."
 *
 * Rule 2
 *
 * One candidate with the same color in two cells of a group.
 *
 * All nodes of the opposite color are solutions.
 *
 * "3...52...25.3...1...46.7523.932..8.557.....3.4.8.35.6...54.83...3.5.6.8484..23.56" after A7x79, B7x9
 *
 * Rule 3
 *
 * Two candidates with opposite colors in the same cell.
 *
 * If this is not a bi-value cell, the other candidates may be removed from it.
 *
 * "29....83.....2.97....1.94.28457612936.....547..9.45..89.34.7....6..3.7.9.5....384"
 *
 * Rule 4
 *
 * Two nodes for a candidate with opposite colors that cannot see each other.
 *
 * The candidate may be removed from all off-graph cells that see both nodes.
 *
 * "1...56..3.43.9....8...43..2.3.56.21.95.421.37.21.3....31798...5...31.97....67.3.1"
 *
 * Rule 5
 *
 * Similar to rule 4 except the off-graph candidate must be in the same cell
 * as one of the nodes, and obviously the nodes are neighbors.
 *
 * The off-graph candidate may be removed.
 *
 * "9234.7.15876.5.9245..2...3.769.2.14.432....59185..426..98.42.712.7.3.486...7.8.92"
 *
 * Rule 6
 *
 * Every candidate in an off-graph cell can see a node with the same candidate,
 * and every one of those seen nodes is the same color.
 *
 * All nodes of the opposite color are solutions.
 *
 * "9867213453.4956..7..7.3.96..73.65..969..17..31..39.276...679.3..691437..731582694"
 *
 * Rule 7
 *
 * Similar to rule 6 but extended to checking for unsolvable groups.
 *
 * All nodes of the opposite color are solutions.
 *
 * "163...987794..3256258769..4..6...72.87.6...4.4....76..341..687.68..7...2.273.8461"
 * "...4.........15....5.3.7..8135.8..9...2..9.53..9.53.......76.34..4..1...7..5..92."
 *
 * @link https://www.sudokuwiki.org/3D_Medusa
 */
export default function solveThreeDMedusa(board: ReadableBoard): Moves {
  const moves = Moves.createEmpty();

  const nodesByKey = new Map<Cell, Map<Known, Node>>();
  const graphs = new Set<Graph>();

  Graph.resetCount();

  function findOrAddNode(cell: Cell, known: Known): Node {
    let node;
    const knowns = nodesByKey.get(cell);

    if (knowns) {
      node = knowns.get(known);

      if (!node) {
        node = new Node(cell, known);
        knowns.set(known, node);
      }
    } else {
      node = new Node(cell, known);
      nodesByKey.set(cell, new Map().set(known, node));
    }

    return node;
  }

  function addEdge(from: Node, to: Node) {
    from.add(to);
    to.add(from);

    LOG &&
      console.info(
        "[3d-medusa] EDGE",
        from.key,
        from.graph?.index,
        to.key,
        to.graph?.index
      );

    if (from.graph && to.graph) {
      const remove = from.graph.merge(to.graph);
      if (remove) {
        // console.info("delete", remove);
        graphs.delete(remove);
      }
    } else if (from.graph) {
      from.graph.extend(to);
    } else if (to.graph) {
      to.graph.extend(from);
    } else {
      graphs.add(new Graph(from, to));
    }
  }

  for (const [cell, knowns] of cellsWithNCandidates(board, 2)) {
    const [k1, k2] = twoValues(knowns);

    addEdge(findOrAddNode(cell, k1), findOrAddNode(cell, k2));
  }
  for (const [known, _, pair] of knownsWithNCandidates(board, 2)) {
    const [c1, c2] = twoValues(pair);

    addEdge(findOrAddNode(c1, known), findOrAddNode(c2, known));
  }

  for (const graph of graphs) {
    graph.colorize();
    graph.addMoves(board, moves);
  }

  // console.info("graphs", graphs);
  // console.info("nodes", nodes);

  return moves;
}

type NodeKey = string; // Cell.key - known

class Node {
  readonly key: NodeKey;
  readonly cell: Cell;
  readonly known: Known;

  readonly edges = new Set<Node>();
  graph?: Graph;
  color?: MarkColor;

  constructor(cell: Cell, known: Known) {
    this.key = `${cell.key}.${known}`;
    this.cell = cell;
    this.known = known;
  }

  add(to: Node) {
    this.edges.add(to);
  }

  join(graph: Graph) {
    this.graph = graph;
  }

  colorize(color: MarkColor) {
    if (this.color) {
      if (this.color !== color) {
        // FIXME Throw error to abort this broken graph?
        LOG &&
          console.warn("[3d-medusa] INVALID", this.cell.key, this.known, this);
      }
    } else {
      this.color = color;

      const other = opposite(color);
      for (const node of this.edges) {
        node.colorize(other);
      }
    }
  }
}

class Graph {
  private static count = 0;

  static resetCount() {
    this.count = 0;
  }

  readonly index: number;
  readonly root: Node;
  readonly nodes = new Set<Node>();

  constructor(from: Node, to: Node) {
    this.index = Graph.count += 1;
    this.root = from;
    this.nodes.add(from).add(to);
    from.join(this);
    to.join(this);
    // console.info("create", this);
  }

  extend(to: Node) {
    // console.info("extend", this, to);
    to.join(this);
    this.nodes.add(to);
  }

  merge(graph: Graph): Graph | null {
    if (this === graph) {
      // console.info("loop", this, graph);
      // loops are fine; nothing to do
      return null;
    }

    const keep = this.nodes.size >= graph.nodes.size ? this : graph;
    const merge = keep === this ? graph : this;

    // console.info("merge", merge, "into", keep);
    for (const node of merge.nodes) {
      node.join(keep);
      keep.nodes.add(node);
    }

    return merge;
  }

  colorize() {
    this.root.colorize("green");
  }

  addMoves(board: ReadableBoard, moves: Moves) {
    if (this.nodes.size < 4) {
      return;
    }

    const cells = new Set<Cell>();
    const cellNodes = new Map<Cell, Node[]>();
    const cellColors = new Map<Cell, Set<MarkColor>>();
    const groupKnownColors = new Map<Cell, Map<Group, Set<MarkColor>>>();

    const rule1s = new Set<MarkColor>();
    const rule2s = new Set<MarkColor>();
    let rule2group: Group | null = null;
    const rule3s = new Map<Cell, Set<Known>>();

    for (const node of this.nodes) {
      const { cell, known, color } = node;

      if (!color) {
        // FIXME Throw error to abort this broken graph?
        LOG && console.warn("[3d-medusa] MISSING COLOR", cell.key, known, node);

        return;
      }

      cells.add(cell);
      deepPush(cellNodes, node, cell);
      if (!deepAdd(cellColors, color, cell)) {
        rule1s.add(color);
      }
      if (!deepAdd(groupKnownColors, color, cell.block, known)) {
        rule2group = rule2group || cell.block;
        rule2s.add(color);
      }
      if (!deepAdd(groupKnownColors, color, cell.row, known)) {
        rule2group = rule2group || cell.row;
        rule2s.add(color);
      }
      if (!deepAdd(groupKnownColors, color, cell.column, known)) {
        rule2group = rule2group || cell.column;
        rule2s.add(color);
      }
    }

    // collect node colors per cell for rule 1
    // and candidates removed from cells solved by both colors for rules 3, 4 and 5

    for (const [cell, nodes] of cellNodes) {
      const knowns = new Set<Known>();
      let first: MarkColor | null = null;
      let both = false;

      for (const { known, color } of nodes) {
        knowns.add(known);
        if (first) {
          if (first === color) {
            rule1s.add(color!);
          } else {
            both = true;
          }
        } else {
          first = color!;
        }
      }

      if (both) {
        const extras = difference(board.getCandidates(cell), knowns);

        if (extras.size) {
          rule3s.set(cell, extras);
        }
      }
    }

    // apply both color solutions to the board and compare the results

    const solutions = new Map<MarkColor, GraphSolution>(
      ["green" as MarkColor, "yellow" as MarkColor].map((color) => {
        const move = this.createMoveAllOneColorSolutions(color);
        const clone = board.clone() as SimpleBoard;
        const causes = Moves.createEmpty();

        move.apply(clone, causes);

        const neighbors = causes.only(Strategy.Neighbor);

        neighbors.applyAll(clone, Strategy.Neighbor);

        const changed = changes(board, clone);
        const diffs = new Map(
          Array.from(changed.entries())
            .map(([cell, changes]) =>
              changes.marks?.size ? [cell, changes.marks] : null
            )
            .filter(Boolean) as [Cell, Set<Known>][]
        );

        return [
          color,
          {
            move,
            clone,
            errors: clone.collectErrors(),
            causes: causes.except(Strategy.Neighbor),
            changed,
            diffs,
          },
        ] as [MarkColor, GraphSolution];
      })
    );

    // Rule 1

    if (rule1s.size) {
      if (rule1s.size === 1) {
        const solution = solutions.get(opposite(singleValue(rule1s)))!;

        LOG && console.info("[3d-medusa] RULE 1", this, solution);

        moves.add(solution.move);
      } else {
        LOG &&
          console.info("[3d-medusa] INVALID Rule 1 triggered for both colors");
      }

      return;
    }

    // Rule 2

    if (rule2s.size) {
      if (rule2s.size === 1) {
        const solution = solutions.get(opposite(singleValue(rule2s)))!;

        LOG && console.info("[3d-medusa] RULE 2", this, rule2group, solution);

        moves.add(solution.move.group(rule2group!));
      } else {
        LOG &&
          console.info("[3d-medusa] INVALID Rule 2 triggered for both colors");
      }

      return;
    }

    // Rules 6 and 7

    const rule6s = new Map<MarkColor, Map<Cell, Set<Known>>>();
    const rule7s = new Map<MarkColor, Map<Known, Set<Group>>>();

    for (const [solved, { errors }] of solutions) {
      const cellKnowns = new Map<Cell, Set<Known>>();

      for (const [cell, error] of errors.cells) {
        if (error === CellError.Unsolvable) {
          cellKnowns.set(cell, board.getCandidates(cell));
        }
      }

      if (cellKnowns.size) {
        rule6s.set(solved, cellKnowns);
      }

      for (const [group, knownErrors] of errors.groups) {
        for (const [known, error] of knownErrors) {
          if (error === GroupError.Unsolvable) {
            deepAdd(rule7s, group, solved, known);
          }
        }
      }
    }

    if (rule6s.size) {
      if (rule6s.size === 1) {
        const solution = solutions.get(opposite(singleValue(rule6s)))!;

        const move = solution.move.clone();
        const cellKnowns = rule6s.get(singleValue(rule6s))!;

        LOG && console.info("[3d-medusa] RULE 6", this, cellKnowns, solution);

        for (const [cell, knowns] of cellKnowns) {
          move.clue(cell, knowns, "yellow");
        }

        moves.add(move);
      } else {
        LOG &&
          console.info("[3d-medusa] INVALID Rule 6 triggered for both colors");
      }

      return;
    }

    if (rule7s.size) {
      if (rule7s.size === 1) {
        const solution = solutions.get(opposite(singleValue(rule7s)))!;

        const move = solution.move.clone();
        const knownGroups = rule7s.get(singleValue(rule7s))!;

        LOG && console.info("[3d-medusa] RULE 7", this, knownGroups, solution);

        for (const [known, groups] of knownGroups) {
          for (const group of groups) {
            move.group(group);

            for (const cell of board.getCandidateCells(group, known)) {
              move.clue(cell, known, "yellow");
            }
          }
        }

        moves.add(move);
      } else {
        LOG &&
          console.info("[3d-medusa] INVALID Rule 7 triggered for both colors");
      }

      return;
    }

    // Rules 3, 4 and 5

    const common = intersectMapsOfSets(
      solutions.get("green")!.diffs,
      solutions.get("yellow")!.diffs
    );

    for (const node of this.nodes) {
      common.get(node.cell)?.delete(node.known);
    }

    const removedByBothColors = withoutEmptySets(common);
    const onGraph = intersectMap(cells, removedByBothColors);
    const rule4s = differenceMap(removedByBothColors, onGraph);
    const rule5s = differenceMap(onGraph, rule3s);

    for (const [rule, marks] of [
      [3, rule3s],
      [4, rule4s],
      [5, rule5s],
    ] as [number, Map<Cell, Set<Known>>][]) {
      if (marks.size) {
        LOG && console.info(`[3d-medusa] RULE ${rule}`, this, marks, solutions);

        const move = this.startMoveWithClues();

        for (const [cell, knowns] of marks) {
          move.mark(cell, knowns);
        }

        moves.add(move);
      }
    }
  }

  startMoveWithClues(
    greenColor: MarkColor = "blue",
    yellowColor: MarkColor = "yellow"
  ) {
    const move = Move.start(Strategy.ThreeDMedusa);

    for (const node of this.nodes) {
      const { cell, known, color } = node;

      move.clue(cell, known, color === "green" ? greenColor : yellowColor);
    }

    return move;
  }

  createMoveAllOneColorSolutions(solved: MarkColor) {
    const move = Move.start(Strategy.ThreeDMedusa);

    for (const node of this.nodes) {
      const { cell, known, color } = node;

      if (color === solved) {
        move.set(cell, known);
      } else {
        move.mark(cell, known);
      }
    }

    return move;
  }
}

const opposite = (c: MarkColor): MarkColor =>
  c === "green" ? "yellow" : "green";

type GraphSolution = {
  move: Move;
  clone: ReadableBoard;
  errors: BoardErrors;
  causes: Moves;
  changed: Map<Cell, CellChanges>;
  diffs: Map<Cell, Set<Known>>;
};
