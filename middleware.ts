import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // _next や静的ファイルを除外した上で…
    '/((?!_next|favicon\\.ico|api/webhooks/clerk|sign-in|sign-up|[^?]*\\.(?:html?|css|js|jpe?g|png|gif|svg|woff2?|ico))).*)',
    // API は常に走らせる
    '/(api|trpc)(.*)',
  ],
};
