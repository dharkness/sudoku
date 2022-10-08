# Sudoku

This app lets you create, play, and solve Sudoku puzzles.


## Goals

This project serves as a way to learn new technologies and showcase how I work,
but feel free to explore and scavenge any code you find useful.

- Learning

  - Get more comfortable with TypeScript to replace JSDoc. 

  - Learn NextJS, Prisma, and tRPC using [`create-t3-app`](https://create.t3.gg/).

  - Learn Tailwind CSS to build React components without a UI framework.


## Terminology

- The `Board` determines the physical structure and layout.

  - It consists of a nine-by-nine grid of eighty-one `Cell`s,
    each identified by a unique `Point` on the grid.

  - The cells are grouped into twenty-seven `Group`s:
    nine `Row`s from top-to-bottom, nine `Column`s from left-to-right,
    and nine three-by-three square `Block`s from top-to-bottom
    then left-to-right.

  - The `neighbors` of a cell are all other cells in the same
    row, column or block.

  - Where a row or column intersects a block, they form an `Intersection`
    with an `Intersect` containing the cells in common and two `Disjoint`s
    containing the cells in one group but not the other.

- A `Puzzle` holds the complete solution of all eighty-one cells
  along with the subset of starting values given to the player.

- The `State` tracks the candidate and solved values of a puzzle in play.

  - Each `Cell` holds a single `Value`: either `Unknown` (empty) or `Known`.

  - Some values are `given` at the start to form the unique puzzle.

  - While a cell is unsolved, it tracks the set of `candidates`, all values
    that the cell could take as a solution given the values of its neighbors.
    They are often called _pencil marks_ since players typically mark up the
    paper with a pencil while solving a physical puzzle.

  - When a cell is solved, its value is removed from the set of candidates
    for each of its neighbors.


## Next Steps

- Documentation
  - Home page
  - How to play
  - Key binding popup card

- Model
  - group candidate cells hold index sets instead of point sets for performance?
    - GroupCellSet
      - group: Group
      - set: Set<Cell>
      - cells: Map<Coord, Cell>
      - indexes: BitSet or CoordSet or 0b000000000 to 0b111111111
    - KnownSet for cell/group/container candidates
  - refactor
    - rename State (solved cells and candidates) to Board, Positions
    - rename Board (if State becomes Board) to Sudoku, Layout, Game, Grid
      - Grid for the structure and Board for the state are a good combo
      - remove state-access methods from Grid; use it only to access structural items

- Play
  - UI
    - known panel
      - highlight hovered known in puzzle panel
      - dim solved knowns
      - add pencil toggle button to swap behavior of number keys (set vs. mark)
    - show errors
      - note that we currently block setting cell to non-candidate
      - incorrectly solved cell
      - incorrectly removed candidate
      - solutions that make puzzle impossible (good for creating new puzzles)
      - easier to show banner when making errors given the model
    - move highlighting
      - show non-clue sets with large number without candidates or overlaid on top?
      - use green for sets only, blue/yellow for clues?
      - extract Move.getDecoration()?
    - solvers
      - state management
        - run solvers in memoized actions state
          - group by strategy
          - use strategies for buttons instead of solvers
          - group by a key that allows detecting identical moves
            - store added and removed moves in each step instead of full set (why?)
        - store strategy to preview to update move after application (what was this?)
      - produce moves when internally erasing marks
      - checkbox to automatically apply each strategy
      - show/apply each solution separately; highlight cells on hover; animate on apply
      - new solvers
        - Unique Rectangles
          https://www.sudokuwiki.org/Unique_Rectangles
        - XY-Chain
          https://www.sudokuwiki.org/XY_Chains
        - Fish
          - generalize X-Wing to Fish
          - Swordfish (3) and Jellyfish (4)
            https://hodoku.sourceforge.net/en/tech_fishb.php
          - Finned and Sashimi Fish
            https://www.sudokuonline.io/tips/sudoku-x-wing

- Create
  - manual partial puzzles
  - random puzzles
