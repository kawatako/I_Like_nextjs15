// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk のミドルウェアを適用（認証・セッション管理）
export default clerkMiddleware();

// 下記パスにマッチしたリクエストのみミドルウェアが実行される
export const config = {
  matcher: [
    /*
      - 全アプリページをガード（改行なし版）
      - `_next` 以下と favicon.ico、Webhook だけをスキップ
    */
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhooks/clerk).*)",
  ],
};
