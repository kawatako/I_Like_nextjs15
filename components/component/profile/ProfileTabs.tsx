// components/component/profile/ProfileTabs.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ProfileRankingLists } from "@/components/component/rankings/ProfileRankingLists";
import PostList from "@/components/component/posts/PostList";
import type { RankingSnippetForProfile,PostWithData } from "@/lib/types";
import { ListStatus } from "@prisma/client"; // ★ ListStatus をインポート ★

// ★ Props の型定義を変更 ★
interface ProfileTabsProps {
  targetUserId: string; // ① プロフィール対象ユーザーのDB ID
  username: string; // ② プロフィール対象ユーザーのユーザー名
  initialPublishedLists: RankingSnippetForProfile[];  //③ 公開リストの初期データ
  publishedNextCursor: string | null; // ④ 公開リストの次のカーソル
  initialDraftLists: RankingSnippetForProfile[];  // ⑤ 下書きリストの初期データ
  draftNextCursor: string | null; // ⑥ 下書きリストの次のカーソル
  userPosts: PostWithData[];  // ⑦ ユーザーの投稿データ
  likedPosts: PostWithData[]; // ⑧ いいねした投稿データ
  isCurrentUser: boolean; // ⑨ 自分のプロフィールかどうかのフラグ
  loggedInUserDbId: string | null;  // ⑩ ログイン中ユーザーのDB ID
}

export function ProfileTabs({
  targetUserId,
  username,
  initialPublishedLists,
  publishedNextCursor,
  initialDraftLists,
  draftNextCursor,
  userPosts,
  likedPosts,
  isCurrentUser,
  loggedInUserDbId
}: ProfileTabsProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // タブ定義 (渡す props を変更)
  let tabs = [];
  if (isCurrentUser) {
    tabs = [
      {
        value: "rankings",
        label: "Rankings",
        // count は初期表示件数ではなく、トータル件数を別途取得するか、非表示にする
        // count: initialPublishedLists.length,
        content: (
          <ProfileRankingLists
            key={`published-${targetUserId}`} // ★ key に status を含めると切り替え時に state がリセットされる
            targetUserId={targetUserId}
            username={username}
            status={ListStatus.PUBLISHED} // ★ status を渡す ★
            initialLists={initialPublishedLists} // ★ 初期リストを渡す ★
            initialNextCursor={publishedNextCursor} // ★ 初期カーソルを渡す ★
            isCurrentUser={isCurrentUser}
          />
        ),
      },
      {
        value: "drafts",
        label: "Drafts",
        // count: initialDraftLists.length,
        content: (
          <ProfileRankingLists
            key={`draft-${targetUserId}`}
            targetUserId={targetUserId}
            username={username}
            status={ListStatus.DRAFT} // ★ status を渡す ★
            initialLists={initialDraftLists} // ★ 初期リストを渡す ★
            initialNextCursor={draftNextCursor} // ★ 初期カーソルを渡す ★
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
            <PostList posts={userPosts} />
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
            <PostList posts={likedPosts} />
          ) : (
            <p className='text-center text-muted-foreground py-8'>
              まだ「いいね」した投稿がありません。
            </p>
          ),
      },
    ];
  } else {
    // 他のユーザーのプロフィールの場合 (公開リストのみ)
    tabs = [
      {
        value: "rankings",
        label: "Rankings",
        // count: initialPublishedLists.length,
        content: (
          <ProfileRankingLists
            key={`published-${targetUserId}`}
            targetUserId={targetUserId}
            username={username}
            status={ListStatus.PUBLISHED}
            initialLists={initialPublishedLists}
            initialNextCursor={publishedNextCursor}
            isCurrentUser={isCurrentUser} // false が渡るはず
          />
        ),
      },
      {
        value: "posts",
        label: "Posts",
        count: userPosts.length,
        content:
          userPosts.length > 0 ? (
            <PostList posts={userPosts} />
          ) : (
            <p className='text-center text-muted-foreground py-8'>
              まだ投稿がありません。
            </p>
          ),
      },
    ];
  }

  const activeTab =
    currentTab && tabs.some((t) => t.value === currentTab)
      ? currentTab
      : tabs[0]?.value || "rankings";

  return (
    <Tabs defaultValue={activeTab} value={activeTab} className='w-full'>
      {/* TabsList は変更なし */}
      <TabsList
        className={`grid w-full ${
          isCurrentUser ? "grid-cols-4" : "grid-cols-2"
        } mb-4`}
      >
        {tabs.map((tab) => (
          <TabsTrigger value={tab.value} key={tab.value} asChild>
            <Link
              href={`/profile/${username}?tab=${tab.value}`}
              className='flex-col h-auto py-1.5 px-1 sm:px-4'
            >
              <span className='text-sm sm:text-base'>{tab.label}</span>
              {/* count を表示する場合は別途取得方法を検討 */}
              {/* {tab.count !== undefined && <span className="text-xs ml-1">({tab.count})</span>} */}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {/* TabsContent は変更なし */}
      {tabs.map((tab) => (
        <TabsContent value={tab.value} key={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
