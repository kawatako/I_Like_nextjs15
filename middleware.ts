// middleware.ts （プロジェクトルート直下）
import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest, NextFetchEvent } from "next/server";

export function middleware(request: NextRequest, event: NextFetchEvent) {
  // clerkMiddleware は (request, event) → Response を返す関数です
  return clerkMiddleware(request, event);
}

export const config = {
  matcher: [
    // これまでと同じ matcher
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
