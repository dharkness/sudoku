# Sudoku

This app lets you create, play, and solve Sudoku puzzles.


## Goals

This project serves as a way to learn new technologies and showcase how I work,
but feel free to explore and scavenge any code you find useful.

-Learning
  -Get more comfortable with TypeScript to replace JSDoc. 
  -Learn NextJS and the T3 stack using [`create-t3-app`](https://create.t3.gg/)


## Next Steps

- Model
  - group possible cells hold index sets instead of point sets for performance?
- Play
  - UI
    - number panel to lock highlight value
      - alt-# to toggle?
      - l-then-# too? multi-key combos may be fun
    - undo/redo
      - z/y to apply
    - show errors
      - currently block setting cell to non-possible
      - incorrectly set cell
      - incorrectly removed possible
      - solutions that make puzzle impossible (good for creating new puzzles)
      - easier to show banner when making errors given the model
    - inspect/apply solvers
      - list of solvers
      - highlight available
      - button to apply
- Create
  - manual partial puzzles
  - random puzzles

## Done?
