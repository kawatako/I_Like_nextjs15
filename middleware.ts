// middleware.ts
console.log("▶︎ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log("▶︎ CLERK_SECRET_KEY present?    =", Boolean(process.env.CLERK_SECRET_KEY));

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // 明示的にオプションでも渡してみる
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey:      process.env.CLERK_SECRET_KEY,
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
