// app/api/suggestions/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = (searchParams.get("subject") ?? "").trim();
  const prefix  = (searchParams.get("prefix")  ?? "").trim();
  const limit   = Math.min(Number(searchParams.get("limit") ?? "10"), 10);

  if (!subject) {
    return NextResponse.json([], { status: 200 });
  }

  const whereClause: any = {
    rankingList: {
      status:  "PUBLISHED",
      subject: { equals: subject, mode: "insensitive" },
    },
  };
  if (prefix.length > 0) {
    whereClause.itemName = { startsWith: prefix, mode: "insensitive" };
  }

  const items = await prisma.rankedItem.findMany({
    where:      whereClause,
    distinct:   ["itemName"],
    select:     { itemName: true },
    orderBy:    { itemName: "asc" },
    take:       limit,
  });

  return NextResponse.json(items.map(i => i.itemName));
}
