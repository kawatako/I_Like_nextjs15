// pages/api/suggestions/items.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  const { subject = "", prefix = "", limit = "10" } = req.query;
  const s = String(subject).trim();
  const p = String(prefix).trim();
  const l = Math.min(Number(limit) || 10, 10);

  console.log("[items] subject=", s, "prefix=", p);
  if (!s) {
    return res.status(200).json([]);
  }

  const whereClause: any = {
    rankingList: {
      status: "PUBLISHED",
      subject: {
        equals: s,
        mode: "insensitive",  // ← 大文字小文字を無視
      },
    },
  };
  if (p.length > 0) {
    whereClause.itemName = {
      startsWith: p,
      mode: "insensitive",  // ← 大文字小文字を無視
    };
  }

  const items = await prisma.rankedItem.findMany({
    where: whereClause,
    distinct: ["itemName"],
    select: { itemName: true },
    orderBy: { itemName: "asc" },
    take: l,
  });

  return res.status(200).json(items.map((i) => i.itemName));
}
