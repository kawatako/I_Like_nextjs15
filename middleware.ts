// プロジェクトルート または src/middleware.ts

import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk のミドルウェアをエクスポート
// Next.js がこの関数を自動的に呼び出すようになります
export default clerkMiddleware();

// ミドルウェア適用パスの設定
export const config = {
  matcher: [
    // _next/static と _next/image、favicon.ico、sign-in／sign-up を除外
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
