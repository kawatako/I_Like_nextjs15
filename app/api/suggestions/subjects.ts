// pages/api/suggestions/subjects.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  const { prefix = "", limit = "10" } = req.query;
  const p = String(prefix);
  const l = Number(limit);
  if (p.length < 3) return res.status(200).json([]);
  const subjects = await prisma.rankingList.findMany({
    where: { status: "PUBLISHED", subject: { startsWith: p } },
    distinct: ["subject"],
    select: { subject: true },
    orderBy: { subject: "asc" },
    take: Math.min(l, 10),
  });
  res.status(200).json(subjects.map(s => s.subject));
}