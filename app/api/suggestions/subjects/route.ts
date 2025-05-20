// app/api/suggestions/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = (searchParams.get("prefix") ?? "").trim();
  const limit  = Math.min(Number(searchParams.get("limit") ?? "10"), 10);

  if (prefix.length < 3) {
    return NextResponse.json([], { status: 200 });
  }

  const subjects = await prisma.rankingList.findMany({
    where: {
      status: "PUBLISHED",
      subject: { startsWith: prefix, mode: "insensitive" },
    },
    distinct:   ["subject"],
    select:     { subject: true },
    orderBy:    { subject: "asc" },
    take:       limit,
  });

  return NextResponse.json(subjects.map(s => s.subject));
}
