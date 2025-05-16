// src/middleware.ts
import { withClerkMiddleware } from "@clerk/nextjs/server";

export default withClerkMiddleware(() => {
  // 何もしなくて OK
});

// middleware の適用範囲。必要に応じて除外パスを増やしてください。
export const config = {
  matcher: [
    /*
      _next/static, _next/image, favicon.ico あたりを除外しつつ、
      sign-in, sign-up ページは Clerk が独自に扱うので除外します。
    */
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
