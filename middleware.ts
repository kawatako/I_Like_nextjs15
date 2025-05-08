// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey:      process.env.CLERK_SECRET_KEY,
});

export const config = {
  matcher: [
    // 1) _next と静的ファイル（拡張子付きファイル）を除外
    // 2) サインイン／サインアップを除外
    // 3) webhooks/clerk も除外
    // 4) それ以外のすべてのページルートを保護
    '/((?!_next/|favicon\\.ico|api/webhooks/clerk|sign-in|sign-up|.*\\..*).*)',
    // API／trpc ルートも常にミドルウェアを通す
    '/api/:path*',
    '/trpc/:path*',
  ],
};
