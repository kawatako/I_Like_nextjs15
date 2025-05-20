// pages/api/suggestions/subjects.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  const { prefix = "", limit = "10" } = req.query;
  const p = String(prefix).trim();
  const l = Math.min(Number(limit) || 10, 10);

  console.log("[subjects] prefix=", p);
  if (p.length < 3) {
    return res.status(200).json([]);
  }

  const subjects = await prisma.rankingList.findMany({
    where: {
      status: "PUBLISHED",
      subject: {
        startsWith: p,
        mode: "insensitive",   // ← 大文字小文字を無視
      },
    },
    distinct: ["subject"],
    select: { subject: true },
    orderBy: { subject: "asc" },
    take: l,
  });

  return res.status(200).json(subjects.map((s) => s.subject));
}
