// components/component/layouts/BottomNavbar.tsx
"use client"; // クライアントフック (usePathname, useUser) を使うため

import Link from "next/link";
import { usePathname } from "next/navigation"; // 現在のパスを取得
import { useUser } from "@clerk/nextjs"; // ログインユーザー情報を取得 (プロフィールリンク用)

// アイコンをインポート (パスは実際の場所に合わせてください)
import { HomeIcon, SearchIcon, HeartIcon, BellIcon, UserIcon } from "../Icons";

export function BottomNavbar() {
  const pathname = usePathname(); // 現在の URL パスを取得
  const { user } = useUser(); // Clerk からユーザー情報を取得

  // プロフィールページのリンク先を動的に生成 (ユーザー名がない場合のフォールバックも考慮)
  // /profile が自分のプロフィールを表示するルートだと仮定
  const profileHref = user?.username ? `/profile/${user.username}` : "/profile";

  // ナビゲーションアイテムを定義
  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/explore", icon: SearchIcon, label: "Explore" }, // パスは仮
    { href: "/likes", icon: HeartIcon, label: "Likes" },       // パスは仮
    { href: "/notifications", icon: BellIcon, label: "Notifications" }, // パスは仮
    { href: profileHref, icon: UserIcon, label: "Profile", isProfile: true }, // プロフィール用に目印
  ];

  return (
    // fixed: 画面下部に固定, h-16: 高さ, bg-background: 背景色 (テーマに依存), border-t: 上境界線
    // flex, items-center, justify-around: アイコンを横に並べて均等配置
    // md:hidden: 中画面以上で非表示 (モバイル専用)
    // z-50: 他の要素より手前に表示
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background flex items-center justify-around md:hidden">
      {navItems.map((item) => {
        // 現在のパスがリンク先と一致するか、またはプロフィールページかどうかの判定
        const isActive = item.isProfile
          ? pathname.startsWith('/profile') // プロフィール関連ページでアクティブ
          : pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            // タップ領域を確保し、中央揃えにするためのスタイル
            className={`flex flex-col items-center justify-center flex-1 p-2 h-full rounded-md transition-colors ${
              isActive
                ? "text-primary" // アクティブ時の色
                : "text-muted-foreground hover:text-primary" // 非アクティブ時・ホバー時の色
            }`}
            // プロフィールデータがまだ読み込めていない場合など、無効化も検討可
             aria-current={isActive ? "page" : undefined}
          >
            {/* アイコンを表示 (サイズ調整) */}
            <item.icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
            {/* 必要であれば非常に小さい文字でラベルを表示しても良いが、アイコンのみが一般的 */}
            {/* <span className="text-[10px] mt-0.5">{item.label}</span> */}
          </Link>
        );
      })}
    </nav>
  );
}