// components/component/layouts/LeftSidebar.tsx
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import {
  HomeIcon,
  SearchIcon,
  TrendingUpIcon,
  BellIcon,
  CrownIcon,
  UserIcon,
  SettingsIcon,
  UsersIcon,
  ChatBubbleIcon
} from "../Icons";

interface UserData {
  id: string;
  username: string | null;
  image: string | null;
}

interface LeftSidebarProps {
  currentLoginUserData: UserData | null;
}

const navItems = [
  { icon: HomeIcon, label: "ホーム", href: "/" },
  {
    icon: UserIcon,
    label: "プロフィール",
    href: (username: string | null) => `/profile/${username ?? ''}`,
  },
  {
    icon: UsersIcon,
    label: "フォロー",
    href: (username: string | null) => `/follows/${username ?? ''}`,
  },
  { icon: CrownIcon, label: "ランキング作成", href: "/rankings/create" },
  { icon: TrendingUpIcon, label: "トレンド", href: "/trends" },
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
        <ul className="space-y-1">
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
                <Link href="https://docs.google.com/forms/d/e/1FAIpQLSdLbVn1Wwbzfa9Zdq6ZjAnrrRMzur-ZKhu4-EXrmT8Q8__p0g/viewform" className="block" target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors">
            <ChatBubbleIcon className="h-5 w-5" />
            <span className="font-medium">ご意見</span>
          </div>
        </Link>
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