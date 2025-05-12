// app/api/keep-alive/route.ts
//vercelで設定したcronjobを動かす、vercel.jsonで設定したcronjobのURLを叩く
import prisma from "@/lib/client";

export async function GET(req: Request) {
  // 任意の認証（後述）チェック
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Keep-alive failed, reconnecting...", err);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      return new Response("Reconnected", { status: 200 });
    } catch {
      return new Response("Error", { status: 500 });
    }
  }
}
