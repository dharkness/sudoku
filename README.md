# Sudoku

This app lets you create, play, and solve Sudoku puzzles.


## Goals

This project serves as a way to learn new technologies and showcase how I work,
but feel free to explore and scavenge any code you find useful.

-Learning
  -Get more comfortable with TypeScript to replace JSDoc. 
  -Learn NextJS and the T3 stack using [`create-t3-app`](https://create.t3.gg/)


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

  - Each `Cell` holds a single solution `Value`: either `Unknown` (empty)
    or `Known` once it has been solved.

  - While a cell is unsolved, it tracks the set of `candidates`, all values
    that the cell could take as a solution given the values of its neighbors.
    They are often called _pencil marks_ since players typically mark up the
    paper with a pencil while solving a physical puzzle.

  - When a cell becomes solved, its value is removed from the set of candidates
    for each of its neighbors.


## Next Steps

- Model
  - group candidate cells hold index sets instead of point sets for performance?
  - refactor
    - rename State (solved cells and candidates) to Board, Positions
    - rename Board (if State becomes Board) to Sudoku, Layout, Game

- Play
  - UI
    - show errors
      - note that we currently block setting cell to non-candidate
      - incorrectly solved cell
      - incorrectly removed candidate
      - solutions that make puzzle impossible (good for creating new puzzles)
      - easier to show banner when making errors given the model

- Create
  - manual partial puzzles
  - random puzzles
