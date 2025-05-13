// lib/db.ts
import prisma from "./client";

/**
 * Prisma のクエリ関数を安全に呼び出し、
 * P1001 切断エラー時には再接続→再試行します。
 */
export async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err.code === "P1001") {
      console.warn("Detected Prisma connection loss, reconnecting...");
      await prisma.$disconnect();
      await prisma.$connect();
      return await fn();
    }
    throw err;
  }
}
