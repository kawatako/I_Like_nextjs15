// app/api/keep-alive/route.ts
import prisma from "@/lib/client";

export async function GET(req: Request) {
  // 認証チェック
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response("OK");
  } catch (e) {
  }
}
