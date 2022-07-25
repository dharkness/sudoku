# Sudoku

This app lets you create, play, and solve Sudoku puzzles.

## Goals

This project serves as a way to learn new technologies and showcase how I work,
but feel free to explore and scavenge any code you find useful.

-Learning
  -Get more comfortable with TypeScript to replace JSDoc. 
  -Learn NextJS and the T3 stack using [`create-t3-app`](t3)


## Next Steps

- Solve
  - intersections between blocks and rows/cols
    - e.g. if a digit is only possible in the intersection of a block and a row,
      it is not possible in the rest of the row or block.
  - model
    - class for EP.solved
    - group possible cells hold index sets instead of point sets for performance
    - instead of copy-on-write for cell/group possibles, collect the removals in a bag
      - no dupes (removing a known from other cells a row removes it from their containing groups)
        - is this causing infinite recursion sometimes? probably not since I check for existence first
      - allows more easy undo?
  - UI
    - show possibles
    - inspect/apply solvers
- Play
  - UI
    - set values, show clear errors
    - auto-remove possibles
  - model
- Create
  - manual partial puzzles
  - random puzzles

## Done?

  [t3]: https://create.t3.gg/
