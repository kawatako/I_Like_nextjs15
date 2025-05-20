// pages/api/suggestions/items.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  const { subject = "", prefix = "", limit = "10" } = req.query;
  const s = String(subject);
  const p = String(prefix);
  const l = Number(limit);
  if (!s) return res.status(400).json([]);
  const whereClause: any = {
    rankingList: { subject: s, status: "PUBLISHED" },
  };
  if (p) whereClause.itemName = { startsWith: p };
  const items = await prisma.rankedItem.findMany({
    where: whereClause,
    distinct: ["itemName"],
    select: { itemName: true },
    orderBy: { itemName: "asc" },
    take: Math.min(l, 10),
  });
  res.status(200).json(items.map(i => i.itemName));
}