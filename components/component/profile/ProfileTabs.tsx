"use client"; // ★ クライアントコンポーネントにする

import { useSearchParams } from "next/navigation"; // ★ useSearchParams フックをインポート
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ProfileRankingLists } from "@/components/component/rankings/ProfileRankingLists";
import PostList from "@/components/component/posts/PostList";
import type { RankingListForProfile } from "@/lib/user/userService"; // 型をインポート (パス注意)
import type { PostWithData } from "@/lib/post/postService"; // 型をインポート (パス注意)

interface ProfileTabsProps {
  userId: string;
  username: string;
  publishedLists: RankingListForProfile[];
  draftLists: RankingListForProfile[]; // 下書きリストも受け取る
  userPosts: PostWithData[];
  likedPosts: PostWithData[];
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
  // --- クライアントサイドで searchParams を取得 ---
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  // -----------------------------------------

  // --- タブの定義 (isCurrentUser で分岐) ---
  let tabs = [];
  if (isCurrentUser) {
    tabs = [
      {
        value: "rankings",
        label: "Rankings",
        count: publishedLists.length,
        content: (
          <ProfileRankingLists
            userId={userId}
            username={username}
            rankingLists={publishedLists}
            isCurrentUser={isCurrentUser}
          />
        ),
      },
      {
        value: "drafts",
        label: "下書き",
        count: draftLists.length,
        content: (
          <ProfileRankingLists
            userId={userId}
            username={username}
            rankingLists={draftLists}
            isCurrentUser={isCurrentUser}
          />
        ),
      },
      {
        value: "posts",
        label: "Posts",
        count: userPosts.length,
        content:
          userPosts.length > 0 ? (
            <PostList posts={userPosts ?? []} />
          ) : (
            <p className='text-center text-muted-foreground py-8'>
              まだ投稿がありません。
            </p>
          ),
      },
      {
        value: "likes",
        label: "Likes",
        count: likedPosts.length,
        content:
          likedPosts.length > 0 ? (
            <PostList posts={likedPosts ?? []} />
          ) : (
            <p className='text-center text-muted-foreground py-8'>
              まだ「いいね」した投稿がありません。
            </p>
          ),
      },
    ];
  } else {
    tabs = [
      {
        value: "rankings",
        label: "Rankings",
        count: publishedLists.length,
        content: (
          <ProfileRankingLists
            userId={userId}
            username={username}
            rankingLists={publishedLists}
            isCurrentUser={isCurrentUser}
          />
        ),
      },
      {
        value: "posts",
        label: "Posts",
        count: userPosts.length,
        content:
          userPosts.length > 0 ? (
            <PostList posts={userPosts ?? []} />
          ) : (
            <p className='text-center text-muted-foreground py-8'>
              まだ投稿がありません。
            </p>
          ),
      },
    ];
  }
  // --------------------------------------------

  // 現在アクティブなタブを決定
  const activeTab =
    currentTab && tabs.some((t) => t.value === currentTab)
      ? currentTab
      : tabs[0]?.value || "rankings";

  return (
    <Tabs defaultValue={activeTab} value={activeTab} className='w-full'>
      {" "}
      {/* value も渡して制御 */}
      <TabsList
        className={`grid w-full ${
          isCurrentUser ? "grid-cols-4" : "grid-cols-2"
        } mb-4`}
      >
        {tabs.map((tab) => (
          <TabsTrigger value={tab.value} key={tab.value} asChild>
            {/* Link はクライアントコンポーネント内で使用 */}
            <Link
              href={`/profile/${username}?tab=${tab.value}`}
              className='flex-col h-auto py-1.5 px-1 sm:px-4'
            >
              <span className='text-sm sm:text-base'>{tab.label}</span>
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        // value を指定して、アクティブなタブの中身のみレンダリング
        <TabsContent value={tab.value} key={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
