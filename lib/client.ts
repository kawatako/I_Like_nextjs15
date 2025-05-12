// lib/client.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Node.js のグローバルスコープにキャッシュ用の変数を追加
  // (Next.js のサーバレス環境でインスタンスを再利用するため)
  var prisma: PrismaClient | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error("Missing SUPABASE_DB_URL environment variable");
  }
  // connection_limit を付与
  const suffix = "&connection_limit=1";
  return url.includes("connection_limit")
    ? url
    : `${url}${url.includes("?") ? "" : ""}${suffix}`;
}

const prisma = global.prisma ?? new PrismaClient({
  datasources: { db: { url: getDatabaseUrl() } },
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
