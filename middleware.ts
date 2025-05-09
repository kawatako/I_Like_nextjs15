// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // まずログイン／サインアップはスキップ
    "/sign-in(.*)",
    "/sign-up(.*)",
    // Next.js の内部や静的アセット
    "/_next/static(.*)",
    "/_next/image(.*)",
    "/favicon.ico",
    // Clerk の Webhook だけは公開
    "/api/webhooks/clerk(.*)",

    // それ以外—拡張子なしの全ページルートを保護
    "/((?!.*\\..*).*)",
  ],
};
