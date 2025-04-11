// components/component/profile/ProfileTabs.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ProfileRankingLists } from "@/components/component/rankings/ProfileRankingLists";
import PostList from "@/components/component/posts/PostList";
import type { RankingSnippetForProfile } from "@/lib/data/userQueries";
import type { PostWithData } from "@/lib/data/postQueries"; // ★ インポート元を変更 ★

interface ProfileTabsProps {
  userId: string;
  username: string;
  publishedLists: RankingSnippetForProfile[];
  draftLists: RankingSnippetForProfile[];
  userPosts: PostWithData[]; // 型を適用
  likedPosts: PostWithData[]; // 型を適用
  isCurrentUser: boolean;
}

export function ProfileTabs({
  userId,
  username,
  publishedLists,
  draftLists,
  userPosts,
  likedPosts,
  isCurrentUser,
}: ProfileTabsProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // タブ定義 (isCurrentUser で分岐)
  let tabs = [];
  if (isCurrentUser) {
    // ... (変更なし、ただし content 内の PostList に渡すデータ型は確認)
      tabs = [
      { value: "rankings", label: "Rankings", count: publishedLists.length, content: <ProfileRankingLists userId={userId} username={username} rankingLists={publishedLists} isCurrentUser={isCurrentUser} />, },
      { value: "drafts", label: "Drafts", count: draftLists.length, content: <ProfileRankingLists userId={userId} username={username} rankingLists={draftLists} isCurrentUser={isCurrentUser} />, },
      { value: "posts", label: "Posts", count: userPosts.length, content: userPosts.length > 0 ? <PostList posts={userPosts} /> : <p className='text-center text-muted-foreground py-8'>まだ投稿がありません。</p>, },
      { value: "likes", label: "Likes", count: likedPosts.length, content: likedPosts.length > 0 ? <PostList posts={likedPosts} /> : <p className='text-center text-muted-foreground py-8'>まだ「いいね」した投稿がありません。</p>, },
    ];
  } else {
    // ... (変更なし)
      tabs = [
        { value: "rankings", label: "Rankings", count: publishedLists.length, content: <ProfileRankingLists userId={userId} username={username} rankingLists={publishedLists} isCurrentUser={isCurrentUser} />, },
        { value: "posts", label: "Posts", count: userPosts.length, content: userPosts.length > 0 ? <PostList posts={userPosts} /> : <p className='text-center text-muted-foreground py-8'>まだ投稿がありません。</p>, },
    ];
  }

  const activeTab = currentTab && tabs.some((t) => t.value === currentTab) ? currentTab : tabs[0]?.value || "rankings";

  return (
    <Tabs defaultValue={activeTab} value={activeTab} className='w-full'>
      <TabsList className={`grid w-full ${isCurrentUser ? "grid-cols-4" : "grid-cols-2"} mb-4`}>
        {tabs.map((tab) => (
          <TabsTrigger value={tab.value} key={tab.value} asChild>
            <Link href={`/profile/${username}?tab=${tab.value}`} className='flex-col h-auto py-1.5 px-1 sm:px-4'>
              <span className='text-sm sm:text-base'>{tab.label}</span>
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent value={tab.value} key={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}