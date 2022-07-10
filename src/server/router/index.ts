// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { puzzleRouter } from "./puzzle";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("puzzle.", puzzleRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
