// app/profile/[username]/tabs/ProfileTabsClient.tsx
"use client";

import { useState, useEffect, Suspense } from 'react'; // ★ Suspense をインポート ★
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link"; // Link を使う場合
// ★ 各タブの内容を表示するコンポーネントをインポート (これらは別途作成) ★
import RankingTab from "./RankingTab";
import DraftsTab from "./DraftsTab";
import FeedTab from "./FeedTab";
import LikesTab from "./LikesTab";
import RankingLikesTab from "./RankingLikesTab";
import { Loader2 } from '@/components/component/Icons'; 

interface ProfileTabsClientProps {
  username: string;
  isCurrentUser: boolean;
  initialTab?: string; // サーバーから渡される初期タブ
  targetUserId: string; // 各タブコンポーネントに渡す用
  loggedInUserDbId: string | null; // 各タブコンポーネントに渡す用
}

export default function ProfileTabsClient({
  username,
  isCurrentUser,
  initialTab,
  targetUserId,    // ★ 受け取る ★
  loggedInUserDbId // ★ 受け取る ★
}: ProfileTabsClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // 現在のパスを取得 (例: /profile/kawatako)
  const router = useRouter();

  // 表示するタブのリスト
  const tabsConfig = [
    { value: "rankings", label: "ランキング", showForEveryone: true },
    { value: "feed", label: "フィード", showForEveryone: true },
    { value: "likes", label: "いいね", showForEveryone: true }, // いいねしたフィード
    { value: "ranking_likes", label: "いいねしたランキング", showForEveryone: true }, // いいねしたランキング ★新規★
    { value: "drafts", label: "下書き", showForEveryone: false }, // 自分のみ表示
  ];

  // isCurrentUser に基づいて表示するタブをフィルタリング
  const availableTabs = tabsConfig.filter(tab => tab.showForEveryone || isCurrentUser);

  // 現在アクティブなタブを決定 (URL > initialTab > 最初のタブ)
  const currentUrlTab = searchParams.get("tab");
  const defaultTab = availableTabs[0].value;
  const [activeTab, setActiveTab] = useState(currentUrlTab || initialTab || defaultTab);

  // searchParams が変更されたら activeTab を更新
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && availableTabs.some(t => t.value === urlTab)) {
      setActiveTab(urlTab);
    } else if (!urlTab) {
      setActiveTab(defaultTab); // URL に tab がなければデフォルトに
    }
    // initialTab は初回のみ考慮
  }, [searchParams, availableTabs, defaultTab]);

  // タブが変更されたときに URL を更新する関数
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `${pathname}?tab=${value}`;
    router.push(newUrl, { scroll: false }); // ページ遷移せずに URL だけ変更
  };

  return (
    // ★ value と onValueChange を使ってタブ切り替えと URL 更新を連動 ★
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-4">
      <TabsList className={`grid w-full ${isCurrentUser ? 'grid-cols-5' : 'grid-cols-4'} mb-4`}>
        {availableTabs.map((tab) => (
          <TabsTrigger value={tab.value} key={tab.value} className="flex-col h-auto py-1.5 px-1 sm:px-4">
             {/* Link を使わず onValueChange で処理する場合 */}
             <span className="text-sm sm:text-base">{tab.label}</span>
             {/* <Link href={`/profile/${username}?tab=${tab.value}`} className='...'>{tab.label}</Link> */}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* 各タブの内容 */}
      {availableTabs.map((tab) => (
        <TabsContent value={tab.value} key={tab.value} className="mt-0">
          {/* ★ Suspense で囲み、データ取得中のフォールバックを表示 ★ */}
          <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            {/* ★ アクティブなタブの内容をレンダリング ★ */}
            {/* 各タブコンポーネントに必要な Props を渡す */}
            {activeTab === tab.value && (
              <>
                {tab.value === "rankings" && <RankingTab targetUserId={targetUserId} isCurrentUser={isCurrentUser} username={username} />}
                {tab.value === "drafts" && isCurrentUser && <DraftsTab targetUserId={targetUserId} isCurrentUser={isCurrentUser} username={username} />}
                {tab.value === "feed" && <FeedTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
                {tab.value === "likes" && <LikesTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
                {tab.value === "ranking_likes" && <RankingLikesTab targetUserId={targetUserId} loggedInUserDbId={loggedInUserDbId} />}
              </>
            )}
             {/* 別タブのコンテンツを裏でレンダリングさせないように activeTab === tab.value で条件分岐 */}
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
}