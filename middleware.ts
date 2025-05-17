// middleware.ts (プロジェクトルート または src/)
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // これで _next/static/_next/image/favicon.ico/sign-in/sign-up/api を除外し、
    // それ以外すべてのページ（と server-side auth() 呼び出し）は Clerk のセッションチェックが働きます。
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up|api).*)",
  ],
};
