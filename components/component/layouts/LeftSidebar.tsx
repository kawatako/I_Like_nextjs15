// components/component/layouts/LeftSidebar.tsx
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// --- ↓↓↓ アイコンのインポートを更新 ↓↓↓ ---
import {
  HomeIcon,
  SearchIcon, // CompassIcon の代わりに SearchIcon
  HeartIcon,
  BellIcon,   // BellIcon を追加
  PlusIcon,   // PlusIcon を追加
  CrownIcon,  // CrownIcon を追加
  UserIcon,
  SettingsIcon,
  // BookmarkIcon, MessageCircleIcon は削除
} from "../Icons"; // アイコンのパスは適宜修正してください

interface UserData {
  id: string;
  username: string | null;
  image: string | null; // User モデルに合わせて 'image' になっているか確認
}

interface LeftSidebarProps {
  currentLoginUserData: UserData | null;
}

// --- ↓↓↓ navItems 配列を更新 ↓↓↓ ---
const navItems = [
  { icon: HomeIcon, label: "Home", href: "/" },
  { icon: SearchIcon, label: "Trends", href: "/trends" }, // Use SearchIcon
  { icon: HeartIcon, label: "Likes", href: "/likes" },
  { icon: BellIcon, label: "Notifications", href: "/notifications" }, // Added
  { icon: PlusIcon, label: "Create Post", href: "/posts/new" }, // Added
  { icon: CrownIcon, label: "Create Ranking", href: "/rankings/new" }, // Added
  {
    icon: UserIcon,
    label: "Profile",
    // username が null の場合は /profile になるように調整 (必要なら '/' などに変更)
    href: (username: string | null) => `/profile/${username ?? ''}`,
  },
];

export default function LeftSidebar({
  currentLoginUserData,
}: LeftSidebarProps) {
  // デスクトップ表示用のクラス (モバイルでは非表示)
  const desktopClasses = "hidden md:flex flex-col";

  return (
    <div className={`${desktopClasses} bg-background text-foreground rounded-lg shadow-md p-4 h-full border`}>
      {/* ユーザー情報表示部分は変更なし */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
        <Avatar className="w-12 h-12 border">
          <AvatarImage src={currentLoginUserData?.image ?? undefined} />
          <AvatarFallback>
             {/* ユーザー名がない場合イニシャル等表示するロジックは省略 */}
            {currentLoginUserData?.username?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-bold">
            {currentLoginUserData?.username ?? 'User'}
          </h3>
          {/* 必要であれば @ユーザー名 などを表示 */}
          {/* <p className="text-sm text-muted-foreground">@{currentLoginUserData?.username}</p> */}
        </div>
      </div>
      {/* ナビゲーションリスト表示部分は変更なし (navItems が変わっただけ) */}
      <nav className="flex-grow">
        <ul className="space-y-1"> {/* 間隔を少し狭める例: space-y-1 */}
          {navItems.map(({ icon: Icon, label, href }) => (
            <li key={label}>
              <Link
                href={
                  typeof href === "function"
                    ? href(currentLoginUserData?.username ?? null)
                    : href
                }
                className="block"
              >
                {/* スタイルを少し調整 (例: padding) */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 設定リンク部分は変更なし */}
      <div className="mt-auto pt-4 border-t">
        <Link href="/settings" className="block">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
            <SettingsIcon className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </div>
        </Link>
      </div>
    </div>
  );
}