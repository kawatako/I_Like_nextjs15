import { PrismaClient } from "@prisma/client";

// globalThis に prisma プロパティがあるかチェックし、なければ undefined になるように型付け
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// prisma インスタンスを生成。
// もし globalThis.prisma が既に存在すればそれを使い、なければ新しい PrismaClient を作る。
const prisma = globalForPrisma.prisma ?? new PrismaClient();

export default prisma; // 生成した prisma インスタンスをエクスポート

// 開発環境 (NODE_ENV が 'production' でない) の場合のみ、
// 作成した prisma インスタンスを globalThis に保存する。
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
