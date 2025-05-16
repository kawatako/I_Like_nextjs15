// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

// ① 一番上で必ず出るログ
console.log("▶️ middleware.ts: clerkMiddleware loaded at", new Date().toISOString());

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};
