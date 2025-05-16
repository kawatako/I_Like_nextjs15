// プロジェクトルート/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest, NextFetchEvent } from "next/server";

// ミドルウェア本体
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  return clerkMiddleware(request, event);
}

// 適用範囲の設定
export const config = {
  matcher: [
    // _next/static, _next/image, favicon, sign-in / sign-up は除外
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};

