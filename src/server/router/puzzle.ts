import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { z } from "zod";

import { createRouter } from "./context";

export const puzzleRouter = createRouter()
  .query("create", {
    input: z.object({
      full: z.string().length(89),
      start: z.string().length(89),
    }),
    async resolve({ ctx, input: { full, start } }) {
      const hash = crypto
        .createHash("md5")
        .update(`${full}|${start}`)
        .digest("hex");
      const puzzle = await ctx.prisma.puzzle.create({
        data: { full, start, hash },
      });
      return { puzzle };
    },
  })

  .query("getAll", {
    async resolve({ ctx }) {
      return { puzzles: await ctx.prisma.puzzle.findMany() };
    },
  })

  .query("get", {
    input: z.object({
      id: z.number().min(1).nullish(),
      hash: z.string().length(32).nullish(),
    }),
    async resolve({ ctx, input: { id, hash } }) {
      let puzzle;
      if (id) {
        puzzle = await ctx.prisma.puzzle.findUnique({ where: { id } });
      } else if (hash) {
        puzzle = await ctx.prisma.puzzle.findFirst({ where: { hash } });
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must pass 'id' or 'hash'",
        });
      }

      if (puzzle) {
        return { puzzle };
      } else {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Puzzle ${id || hash} not found`,
        });
      }
    },
  });
