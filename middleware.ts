// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    /*
      - _next/static と _next/image（Image Optimizer）は除外
      - favicon.ico や public 配下の静的ファイルも除外
      - sign-in や sign-up の Next.js App Router ルートは
        Clerk が内部で扱うので除外するとセッション復元が壊れません
    */
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
