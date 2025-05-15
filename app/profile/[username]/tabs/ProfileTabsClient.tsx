// app/profile/[username]/tabs/ProfileTabsClient.tsx
"use client";

import { useState, useEffect, Suspense } from 'react'; // ★ Suspense をインポート ★
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link"; // Link を使う場合
import RankingTab from "./RankingTab";
import DraftsTab from "./DraftsTab";
import FeedTab from "./FeedTab";
import LikesTab from "./LikesTab";
import RankingLikesTab from "./RankingLikesTab";
import { Loader2 } from '@/components/component/Icons'; 

interface ProfileTabsClientProps {
  username: string;
  isCurrentUser: boolean;
  initialTab?: string;
  targetUserId: string;
  loggedInUserDbId: string | null;
}

interface ProfileTabsClientProps {
  username: string;
  isCurrentUser: boolean;
  initialTab?: string;
  targetUserId: string;
  loggedInUserDbId: string | null;
}

export default function ProfileTabsClient({
  username,
  isCurrentUser,
  initialTab,
  targetUserId,
  loggedInUserDbId
}: ProfileTabsClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tabsConfig = [
    { value: "rankings", label: "ランキング", showForEveryone: true },
    { value: "feed", label: "フィード", showForEveryone: true },
    { value: "likes", label: "いいね", showForEveryone: true },
    { value: "ranking_likes", label: "いいねしたランキング", showForEveryone: true },
    { value: "drafts", label: "下書き", showForEveryone: false },
  ];

  const availableTabs = tabsConfig.filter(tab => tab.showForEveryone || isCurrentUser);
  const currentUrlTab = searchParams.get("tab");
  const defaultTab = availableTabs[0].value;
  const [activeTab, setActiveTab] = useState(currentUrlTab || initialTab || defaultTab);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && availableTabs.some(t => t.value === urlTab)) {
      setActiveTab(urlTab);
    } else if (!urlTab) {
      setActiveTab(defaultTab);
    }
  }, [searchParams, availableTabs, defaultTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `${pathname}?tab=${value}`;
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"> {/* Tailwindでの横スクロール対応 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-4">
        <TabsList className="flex w-full min-w-max"> {/* min-w-maxで内容に合わせて幅を確保 */}
          {availableTabs.map((tab) => (
            <TabsTrigger value={tab.value} key={tab.value} className="flex-shrink-0">
              <span className="text-sm sm:text-base whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTabs.map((tab) => (
          <TabsContent value={tab.value} key={tab.value} className="mt-0">
            <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
              {activeTab === tab.value && (
                <>
                  {tab.value === "rankings" && <RankingTab targetUserId={targetUserId} isCurrentUser={isCurrentUser} username={username} />}
                  {tab.value === "drafts" && isCurrentUser && <DraftsTab targetUserId={targetUserId} isCurrentUser={isCurrentUser} username={username} />}
                  {tab.value === "feed" && <FeedTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
                  {tab.value === "likes" && <LikesTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
                  {tab.value === "ranking_likes" && <RankingLikesTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
                </>
              )}
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
