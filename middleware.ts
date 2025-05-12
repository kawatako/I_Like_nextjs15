export const runtime = "nodejs";      // ← これを必ず最上部に
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/client";
import { clerkMiddleware } from "@clerk/nextjs/server";

// --- ライトウォームアップ --- 
async function warmUpConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    await prisma.$disconnect();
    await prisma.$connect();
  }
}

const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  const path = req.nextUrl.pathname;

  // 静的資産／Webhook はスキップ
  if (
    !path.startsWith("/api/webhooks/clerk") &&
    !path.startsWith("/_next/") &&
    !path.endsWith("favicon.ico")
  ) {
    await warmUpConnection();
  }

  return clerkMw(req, ev);
}

export const config = {
  matcher: [
    "/api/webhooks/clerk",
    "/_next/static/:path*",
    "/_next/image/:path*",
    "/favicon.ico",
    "/:path*",
  ],
};
