// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey:      process.env.CLERK_SECRET_KEY,
});

export const config = {
  matcher: [
    // 1) Next.js の内部静的アセットはスキップ
    // 2) Clerk の Webhook（API）だけはスキップ
    // 3) サインイン／サインアップは自前で描画させる
    '/((?!_next/static|_next/image|favicon\\.ico|api/webhooks/clerk|sign-in|sign-up).*)',
    // 4) trpc やその他 API ルートは別途キャッチ
    '/api/:path*',
    '/trpc/:path*',
  ],
};
