// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk のミドルウェアを適用（認証・セッション管理）
const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  // ミドルウェアでは Prisma を使わず認証のみ実行
  return clerkMw(req, ev);
}

// 下記パスにマッチしたリクエストのみミドルウェアが実行される
export const config = {
  matcher: [
    // 1. Webhook: 認証不要の Webhook 処理を許可
    "/api/webhooks/clerk",
    // 2. API: その他の API は保護対象
    "/api/:path*",
    // 3. 認証ページ: サインイン・サインアップは認証前にスキップ
    "/sign-in(.*)",
    "/sign-up(.*)",
    // 4. 静的ファイル: Next.js の内部ファイルやアイコンをスキップ
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico",
    // 5. アプリページ: 拡張子のない全ページルートを保護
    "/((?!.*\..*).*)",
  ],
};