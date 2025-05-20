// components/layouts/Header.tsx
"use client";

import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/munu"
import { SettingsIcon } from "@/components/Icons";
import Link from "next/link";
import SearchForm from "../search/SearchForm";
import { LogInIcon, ChatBubbleIcon, BulbIcon } from "@/components/Icons";
import { ClerkLoading, SignedIn, SignedOut, useClerk } from "@clerk/nextjs";
import { useTutorial } from "@/lib/hooks/useTutorial";
import TutorialModal from "@/components/TutorialModal";

interface HeaderProps {
  currentLoginUserData: { id: string; username: string | null; image: string | null } | null;
}

export default function Header({ currentLoginUserData }: HeaderProps) {
  const { seen, open, openTutorial, closeTutorial } = useTutorial();

  const { signOut, openUserProfile } = useClerk();

  return (
    <>
      <header className="bg-background shadow-md px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0" prefetch={false}>
          <LogInIcon className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary hidden sm:inline">TopMe</span>
        </Link>

        {/* 検索 */}
        <div className="flex-1 flex justify-center px-2 sm:px-4">
          <SearchForm />
        </div>

        {/* アンケート */}
        <Link
          href="https://docs.google.com/forms/…"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
        >
          <ChatBubbleIcon className="h-5 w-5 text-foreground/80" />
        </Link>

        {/* チュートリアルアイコン */}
        <button
          onClick={openTutorial}
          className={`relative p-2 rounded-full hover:bg-muted transition-colors ${
            seen ? "text-gray-400" : "text-primary"
          }`}
          title="使い方を見る"
        >
          <BulbIcon className="h-6 w-6" />
          {!seen && (
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* ユーザー関連 (歯車メニュー) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <ClerkLoading>
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </ClerkLoading>

          <SignedIn>
            <Menu>
              <MenuTrigger asChild>
                <button
                  className="p-2 rounded-full hover:bg-muted transition-colors text-foreground/80"
                  title="アカウント設定"
                >
                  <SettingsIcon className="h-6 w-6" />
                </button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem onSelect={() => openUserProfile()}>
                  プロフィール設定
                </MenuItem>
                <MenuItem onSelect={() => signOut({ redirectUrl: "/" })}>
                  サインアウト
                </MenuItem>
              </MenuContent>
            </Menu>
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
      </header>

      <TutorialModal open={open} onClose={closeTutorial} />
    </>
  );
}
