// lib/client.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error("Missing SUPABASE_DB_URL");
  }
  return url;
}

// PrismaClient のインスタンスを作成 or グローバル再利用
const prisma = global.prisma ?? new PrismaClient(
  {
    datasources: { db: { url: getDatabaseUrl() } },
    __internal: {
      engine: {
        retry: { max: 2, backoff: 200 },
      },
    },
  } as any, // ← ここで any キャスト
);

// 開発環境ではグローバルキャッシュ
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// 接続エラー（P1001）のときに自動再接続＆リトライするミドルウェア
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (err: any) {
    if (err.code === "P1001") {
      console.warn("Prisma connection lost. Reconnecting...");
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        return await next(params);
      } catch (reconnectErr) {
        console.error("Reconnection failed:", reconnectErr);
      }
    }
    throw err;
  }
});

export default prisma;
