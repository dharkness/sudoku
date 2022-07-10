// src/pages/api/examples.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "crypto";
import { prisma } from "../../server/db/client";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const hash = crypto.createHash("md5").update("hello world").digest("hex");
  res.json({ hash });
};
