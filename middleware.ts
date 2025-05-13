// middleware.ts
export const runtime = "nodejs";
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/api/webhooks/clerk",
    "/api/:path*",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/_next/static/:path*",
    "/_next/image/:path*",
    "/favicon.ico",
    "/((?!.*\\..*).*)",
  ],
};
