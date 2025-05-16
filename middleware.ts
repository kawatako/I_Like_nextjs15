// (プロジェクトルートまたは src/)middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest, NextFetchEvent } from "next/server";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  console.log("▶️ clerkMiddleware called for:", request.nextUrl.pathname);
  return clerkMiddleware(request, event);
}

export const config = {
  matcher: [
    // 静的ファイル・認証ルートを除外
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
