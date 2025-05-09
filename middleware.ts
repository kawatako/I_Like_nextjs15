// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // まず Webhook はスキップ
    "/api/webhooks/clerk",
    // API 全体（他は保護）
    "/api/:path*",
    // ログイン／サインアップはスキップ
    "/sign-in(.*)",
    "/sign-up(.*)",
    // 静的アセットはスキップ
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico",
    // それ以外—拡張子なしのページルートを保護
    "/((?!.*\\..*).*)",
  ],
};
