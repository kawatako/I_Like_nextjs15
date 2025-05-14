// components/component/layouts/LeftSidebar.tsx
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import {
  HomeIcon,
  SearchIcon,
  HeartIcon,
  BellIcon,
  PlusIcon,
  CrownIcon,
  UserIcon,
  SettingsIcon,
  UsersIcon,
} from "../Icons"; // アイコンのパスは適宜修正してください

interface UserData {
  id: string;
  username: string | null;
  image: string | null; // User モデルに合わせて 'image' になっているか確認
}

interface LeftSidebarProps {
  currentLoginUserData: UserData | null;
}

const navItems = [
  { icon: HomeIcon, label: "ホーム", href: "/" },
  {
    icon: UserIcon,
    label: "プロフィール",
    // username が null の場合は /profile になるように調整 (必要なら '/' などに変更)
    href: (username: string | null) => `/profile/${username ?? ''}`,
  },
  {
    icon: UsersIcon,
    label: "フォロー",
    href: (username: string | null) => `/follows/${username ?? ''}`,
  },
  { icon: CrownIcon, label: "ランキング作成", href: "/rankings/create" },
  { icon: SearchIcon, label: "トレンド", href: "/trends" },
  { icon: BellIcon, label: "通知", href: "#" }, 
];

export default function LeftSidebar({
  currentLoginUserData,
}: LeftSidebarProps) {
  // デスクトップ表示用のクラス (モバイルでは非表示)
  const desktopClasses = "hidden md:flex flex-col";

  return (
    <div className={`${desktopClasses} bg-background text-foreground rounded-lg shadow-md p-4 h-full border`}>
      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
        <Avatar className="w-12 h-12 border">
          <AvatarImage src={currentLoginUserData?.image ?? undefined} />
          <AvatarFallback>
            {currentLoginUserData?.username?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-bold">
            {currentLoginUserData?.username ?? 'User'}
          </h3>
        </div>
      </div>
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
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t">
        <Link href="/#" className="block">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
            <SettingsIcon className="h-5 w-5" />
            <span className="font-medium">設定</span>
          </div>
        </Link>
      </div>
    </div>
  );
}