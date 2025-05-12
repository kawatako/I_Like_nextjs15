// app/api/keep-alive/route.ts
//フロントエンドからの ping に応じて DB 接続を維持する
import { NextResponse } from "next/server";
import prisma from "@/lib/client";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  // GitHub Actions など cron 用のヘッダーがない場合は OK 扱い
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    // 切断時は再接続
    await prisma.$disconnect();
    await prisma.$connect();
    return NextResponse.json({ reconnected: true });
  }
}
