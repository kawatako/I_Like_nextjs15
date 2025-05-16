// components/component/layouts/Header.tsx
"use client";

import Link from "next/link";
import SearchForm from "../search/SearchForm";
import { LogInIcon,ChatBubbleIcon } from "../Icons";
import { ClerkLoading, SignedIn, SignedOut } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  currentLoginUserData: {
    id: string;
    username: string | null;
    image: string | null;   // 署名付きURLを含むフルURL
  } | null;
}


export default function Header({currentLoginUserData}: HeaderProps) {
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

            {/* サービス品質アンケート (ユーザー関連の左) */}
      <Link
        href="https://docs.google.com/forms/d/e/1FAIpQLSdLbVn1Wwbzfa9Zdq6ZjAnrrRMzur-ZKhu4-EXrmT8Q8__p0g/viewform"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors" // アイコンのサイズとホバーエフェクト
      >
        <ChatBubbleIcon className="h-5 w-5 text-foreground/80" />
      </Link>

      {/* ユーザー関連 (右端) */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div>
          <ClerkLoading>
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </ClerkLoading>
          <SignedIn>
                    {currentLoginUserData ? (
           <Avatar className="w-8 h-8 border">
             <AvatarImage
               src={currentLoginUserData.image ?? undefined}
               alt={`${currentLoginUserData.username} のアイコン`}
             />
             <AvatarFallback>
               {currentLoginUserData.username?.slice(0, 2).toUpperCase()}
             </AvatarFallback>
           </Avatar>
         ) : null}
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
