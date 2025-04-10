"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
// ↓↓↓ useState, FormEvent をインポート ↓↓↓
import { useState, FormEvent } from "react";
// ↓↓↓ useRouter をインポート ↓↓↓
import { useRouter } from "next/navigation";
// ↓↓↓ アイコンのインポートを確認・整理 ↓↓↓
import { LogInIcon, SearchIcon } from "../Icons"; // BellIcon, MailIcon は現在使われていない
import { ClerkLoading, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"; // App Router 用

export default function Header() {
  // ★ 検索クエリ用の State ★
  const [searchQuery, setSearchQuery] = useState("");
  // ★ ナビゲーション用の Router ★
  const router = useRouter();

  // ★ 検索フォーム送信時の処理 ★
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // ページの再読み込みを防ぐ
    const trimmedQuery = searchQuery.trim(); // 入力値の前後の空白を削除
    if (trimmedQuery) {
      // 検索結果ページに遷移
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      // 検索後に検索窓を空にする場合は下のコメントを解除
      // setSearchQuery("");
    }
  };

  return (
    // justify-between で要素を両端に、gap で要素間の最低限の隙間を確保
    <header className="bg-background shadow-md px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      {/* ロゴ (左端) - 幅が変わらないように flex-shrink-0 */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0" prefetch={false}>
        <LogInIcon className="h-6 w-6 text-primary" />
        {/* スマホではテキストを隠す例 */}
        <span className="text-lg font-bold text-primary hidden sm:inline">I Like</span>
      </Link>

      {/* 検索フォーム (中央、可能な限り幅を取る) */}
      {/* flex-1 で利用可能なスペースを使い、中央寄せ */}
      <div className="flex-1 flex justify-center px-2 sm:px-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md"> {/* 最大幅を設定 */}
          <Input
            type="text"
            placeholder="ランキングやアイテムを検索..." // プレースホルダー変更
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 rounded-full border h-9" // 高さを少し調整
          />
          {/* 虫眼鏡アイコンをクリックでも検索実行できるように button に */}
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
             <SearchIcon className="h-5 w-5" />
             <span className="sr-only">検索</span> {/* スクリーンリーダー用 */}
          </button>
        </form>
      </div>

      {/* ユーザー関連 (右端) - 幅が変わらないように flex-shrink-0 */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* BellIcon, MailIcon はコメントアウトのまま */}

        {/* Clerk 認証状態 */}
        <div>
          <ClerkLoading>
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div> {/* スピナーの代わりにスケルトン表示 */}
          </ClerkLoading>
          <SignedIn>
            {/* サインアウト後のリダイレクト先を指定 */}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
             {/* 少しスタイル調整 */}
            <Link href={"/sign-in"} className="text-sm font-medium hover:text-primary transition-colors">
              ログイン
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}