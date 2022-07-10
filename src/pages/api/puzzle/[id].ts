// src/pages/api/examples.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../server/db/client";

export default async function puzzle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = req.query["id"];

  if (typeof id !== "string") {
    res.status(400).json({ message: "A single ID is required" });
    return;
  }

  const puzzle = await (/^\d+$/.test(id)
    ? prisma.puzzle.findUnique({ where: { id: parseInt(id) } })
    : prisma.puzzle.findFirst({ where: { hash: id } }));

  if (!puzzle) {
    res.status(404).json({ message: "Board ID or hash not found" });
    return;
  }

  res.json({ message: `Board for ${id}`, puzzle });
}
