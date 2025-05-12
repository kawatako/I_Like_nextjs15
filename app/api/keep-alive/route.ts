// app/api/keep-alive/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/client";

export async function GET(req: Request) {
  // シークレット認証（GitHub Actions からの呼び出し用）
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 軽いクエリでプール接続をチェック
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Keep-alive failed, reconnecting...", err);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      return NextResponse.json({ reconnected: true });
    } catch (err2) {
      console.error("Reconnect also failed", err2);
      return new NextResponse("Error", { status: 500 });
    }
  }
}
