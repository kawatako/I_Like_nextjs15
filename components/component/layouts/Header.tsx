// components/component/layouts/Header.tsx
"use client";

import Link from "next/link";
import SearchForm from "../search/SearchForm";
import { LogInIcon } from "../Icons";
import { ClerkLoading, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="bg-background shadow-md px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      {/* ロゴ (左端) */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0" prefetch={false}>
        <LogInIcon className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-primary hidden sm:inline">TopMe</span>
      </Link>

      {/* 検索フォーム (中央) */}
      <div className="flex-1 flex justify-center px-2 sm:px-4">
        <SearchForm />
      </div>

      {/* ユーザー関連 (右端) */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div>
          <ClerkLoading>
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </ClerkLoading>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              ログイン
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
