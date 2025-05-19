// components/layouts/Header.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SearchForm from "../search/SearchForm";
import { LogInIcon, ChatBubbleIcon } from "@/components/Icons";
import { ClerkLoading, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTutorial } from "@/lib/hooks/useTutorial";
import TutorialModal from "@/components/TutorialModal";
import { BulbIcon } from "@/components/Icons";

interface HeaderProps {
  currentLoginUserData: { id: string; username: string | null; image: string | null } | null;
}

export default function Header({ currentLoginUserData }: HeaderProps) {
  const { seen, markAsSeen } = useTutorial();
  const [modalOpen, setModalOpen] = useState(false);

  const openTutorial = () => setModalOpen(true);
  const closeTutorial = () => {
    markAsSeen();
    setModalOpen(false);
  };

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
          {!seen && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" />}
        </button>
        {/* ユーザー関連 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <ClerkLoading><div className="h-8 w-8 animate-pulse rounded-full bg-muted" /></ClerkLoading>
          <SignedIn>
            {currentLoginUserData && (
              <UserButton afterSignOutUrl="/">
                <Avatar className="w-8 h-8 border">
                  <AvatarImage src={currentLoginUserData.image ?? undefined} alt={currentLoginUserData.username ?? undefined} />
                  <AvatarFallback>{currentLoginUserData.username?.slice(0,2).toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
              </UserButton>
            )}
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">ログイン</Link>
          </SignedOut>
        </div>
      </header>
      {/* チュートリアルモーダル */}
      <TutorialModal open={modalOpen} onClose={closeTutorial} />
    </>
  );
}
