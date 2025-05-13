// lib/client.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getPoolUrl(): string {
  const url = process.env.DATABASE_URL; // <- Data Proxy 用
  if (!url) throw new Error("Missing DATABASE_URL (pooling URL)");
  return url;
}

function getDirectUrl(): string {
  const url = process.env.DIRECT_DATABASE_URL; // <- 直結用
  if (!url) throw new Error("Missing DIRECT_DATABASE_URL");
  return url;
}

// PrismaClient のデフォルト設定は schema.prisma（DIRECT_DATABASE_URL）を使うが…
// 本番起動時だけ override してプーリング用に差し替える
const prisma = global.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === "production"
        ? getPoolUrl()   // 本番では Data Proxy（DATABASE_URL）を使う
        : getDirectUrl(),// 開発時は直結（DIRECT_DATABASE_URL）でもOK
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
