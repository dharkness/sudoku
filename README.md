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

- The `Grid` determines the physical structure and layout.

  - It consists of a nine-by-nine grid of eighty-one `Cell`s,
    each identified by a unique `Point` on the grid.

  - The cells are grouped into twenty-seven `Group`s:
    - nine `Row`s from top-to-bottom,
    - nine `Column`s from left-to-right, and
    - nine three-by-three square `Block`s.

  - The `neighbors` of each cell consist of every cell in the same
    row, column or block.

  - Where a row or column intersects a block, they form an `Intersection`
    with an `Intersect` containing the cells in common and two `Disjoint`s
    containing the cells in one group but not the other.

- A `Puzzle` holds the complete `solution` of all eighty-one cells
  along with the subset of `given` values that the player uses
  to solve the puzzle.

- A `Board` tracks the candidate and solved values of a puzzle in play.

  - Each `Cell` holds a single `Value`: either `Unknown` (empty) or `Known`.

  - While a cell is unsolved, it tracks the set of `candidate`s, all values
    that the cell could take as a solution given the values of its neighbors.
    They are often called _pencil marks_ since players typically mark up the
    paper with a pencil while solving a physical puzzle.

  - When a cell is solved, its value is removed from the set of candidates
    for each of its neighbors.

- A `Solver` is an algorithm applied to the board to find cells that can
  be solved or marks that can be removed.

  - The solver packages the `clue`s that allowed the determination 
    and the changes to apply (`set`s and `mark`s) into a `Move`.


## Next Steps

- Documentation
  - Home page
  - How to play
  - Key binding popup card

- Model
  - `Board` was a better name for the structure than the current knowns and candidates
    - rename `Grid` back to `Board` and `Board` to `Clues`?
      - `ReadableClues` and `WritableClues`? `SimpleClues`?
      - are these distinctions even necessary anymore with cloning instead of copy-on-write? 
  - group candidate cells hold index sets instead of point sets for performance?
    - GroupCellSet
      - group: Group
      - set: Set<Cell>
      - cells: Map<Coord, Cell>
      - indexes: BitSet or CoordSet or 0b000000000 to 0b111111111
    - KnownSet for cell/group/container candidates
  - replace Solutions with Moves
    - update all strategies to use Moves instead of Move[]
    - rename Move's set() to solve(), mark() to erase()?
      - latter works with marks() unchanged, but sets() doesn't match (solutions()?)
      - gets complicated when adding support for clearing knowns and adding candidates

- Play
  - UI
    - options
      - dark mode
      - show mark numbers: never, always, when highlighted
    - selected cell
      - highlight all common candidates, not just known of solved cell
    - known panel
      - highlight hovered known in puzzle panel
      - allow multiple locked knowns (alt-shift-# to toggle)
      - dim solved knowns
      - add pencil toggle button to swap behavior of number keys (set vs. mark)
    - show errors
      - note that we currently block setting cell to non-candidate
      - duplicate in group
      - no candidates left in cell/group (don't detect the latter yet)
      - incorrectly solved cell
      - incorrectly removed candidate
    - move highlighting
      - show non-clue sets with large number without candidates or overlaid on top?
      - clues only, marks only, cells only to help you learn to spot stuff
      - use green for sets only, blue/yellow for clues?
      - extract Move.getDecoration()?
    - solvers
      - state management
        - run solvers in memoized actions state
          - group by strategy
          - use strategies for buttons instead of solvers
          - group by a key that allows detecting identical moves
            - store added and removed moves in each step instead of full set (why?)
          - run each solver in a promise
            - show icons on solver buttons that are still running
            - break Brute Force up somehow so it doesn't block the UI
        - store strategy to highlight in state on hover instead of its first move
          so applying the move can highlight the next move for the strategy
      - checkbox to automatically apply individual strategies
      - show/apply each solution separately; highlight cells on hover; animate on apply
      - new solvers
        - X-Cycles
          https://www.sudokuwiki.org/X_Cycles
        - XY-Chain
          https://www.sudokuwiki.org/XY_Chains
        - Fish
          - Finned and Sashimi Fish
            https://www.sudokuonline.io/tips/sudoku-x-wing

- Create
  - manual partial puzzles
  - random puzzles
