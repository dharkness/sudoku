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
  - refactor `SimpleBoard`
    - create CopyOnWriteBoard
      - move logic from Board to Grid, using API to apply changes, or just use a base class
    - data model
      - change `values` to `knowns` and hold only solved cells
        - solvedCount() and isSolved() become simple size checks
      - add full grid container to easily find all cells that contain a candidate
      - maintain cell errors and remove `collectErrors()`
        - duplicate known in group
        - no candidates in cell
        - cell solved to non-candidate?
      - track cells with N candidates per container (group and grid)
      - track candidates with N cells per group?
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
        - use `number` types with functions and table lookup for `size()`
    - KnownSet for cell/group/container candidates
  - rename Move's set() to solve(), mark() to erase()?
    - may not play nice if we add ability to clear a cell or add a mark
    - latter works with marks() unchanged, but sets() doesn't match (solutions()?)
    - gets complicated when adding support for clearing knowns and adding candidates
  - Add methods to Move:
    - check if all marks/sets are still valid
    - create a new Move that contains only the valid clues/marks/sets
    - probably not super useful since we run all solvers after each move is applied

- Play
  - UI
    - reset/undo/redo/redo-all using old school tape recorder button icons
      - undo to first error
    - number of cells solved/unsolved
    - options
      - dark mode
      - show marks: no, or numbers never, always, when highlighted
      - mark/panel layout (phone vs. keypad); right-to-left too?
      - grid coords: top/left, bottom/right, both
    - selected cell
      - highlight all common candidates, not just known of solved cell
      - Y is PageUp and Redo; Shift-Z or A or B for Redo?
    - known panel
      - highlight hovered known in puzzle panel
      - allow multiple locked knowns (alt-shift-# to toggle)
      - dim solved knowns
      - add pencil toggle button to swap behavior of number keys (set vs. mark)
      - add button to reset all candidates using solved cells (and automatic strategies once implemented) only
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
      - highlight Brute Force sets in yellow in cells without the solution as a candidate?
        - requires forcing a missing candidate when it has a color
          and altering the color unless the solver does it which is doable
      - filter moves to those that affect a cell/candidate somehow
        - use current cell (easy)
        - combine with highlighted known (easy until we allow locking multiple knowns)
        - use to provide clues
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
      - standardize debug logging
      - log all moves in a panel
        - model specific solutions
      - new solvers
        - X-Cycles
          - https://www.sudokuwiki.org/X_Cycles
            - collect strong and weak links
            - form cycles
            - adjust strong links to weak links to expand choices
        - Fish
          - Finned and Sashimi Fish
            - https://www.sudokuonline.io/tips/sudoku-x-wing
        - WXYZ-Wing
          - https://www.sudokuwiki.org/WXYZ_Wing
        - Fireworks
          - https://www.sudokuwiki.org/Fireworks
      - fix Brute Force
        - fails when it finds a deadly rectangle but reports a solution

- Create
  - manual partial puzzles
  - random puzzles
