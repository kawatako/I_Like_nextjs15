// app/follows/[username]/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// ↓↓↓ userQueries から関数をインポート (パス確認) ↓↓↓
import {
  getUserByUsername,
  getUserDbIdByClerkId,
} from "@/lib/data/userQueries";

// ★★★ 作成したリスト表示コンポーネントをインポート ★★★
import { FollowingList } from "@/components/component/follows/FollowingList";
import { FollowersList } from "@/components/component/follows/FollowersList";
import { FollowRequestsList } from "@/components/component/follows/FollowRequestsList";

interface FollowsPageProps {
  params: { username: string };
  searchParams: { tab?: string };
}

export default async function FollowsPage({
  params,
  searchParams,
}: FollowsPageProps) {
  const { username: targetUsername } = params;
  const { userId: loggedInClerkId } = await auth(); // 閲覧者の Clerk ID
  const targetUser = await getUserByUsername(targetUsername); // 表示対象ユーザー
  if (!targetUser) {
    notFound();
  }
  const targetUserDbId = targetUser.id; // ★ 表示対象ユーザーの DB ID
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId); // 閲覧者の DB ID
  const isOwner = loggedInUserDbId === targetUserDbId; // 所有者フラグ

  const validTabs = ["following", "followers"];
  if (isOwner) {
    validTabs.push("requests");
  }
  const defaultTab =
    typeof searchParams.tab === "string" && validTabs.includes(searchParams.tab)
      ? searchParams.tab
      : "following";

  return (
    <div className='container mx-auto p-4 md:p-6 max-w-2xl'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>
          {targetUser.name ?? targetUser.username}
        </h1>
        <Link href={`/profile/${targetUsername}`}>
          <Button variant='outline' size='sm'>
            プロフィールへ
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={defaultTab} className='w-full'>
        <TabsList
          className={`grid w-full ${
            isOwner ? "grid-cols-3" : "grid-cols-2"
          } mb-4`}
        >
          <TabsTrigger value='following'>フォロー中</TabsTrigger>
          <TabsTrigger value='followers'>フォロワー</TabsTrigger>
          {isOwner && (
            <TabsTrigger value='requests'>フォローリクエスト</TabsTrigger>
          )}
        </TabsList>

        {/* ↓↓↓ 各タブのコンテンツを対応するリストコンポーネントに置き換え ↓↓↓ */}
        <TabsContent value='following'>
          {/* ★ FollowingList に targetUserId を渡す ★ */}
          <FollowingList targetUserId={targetUserDbId} />
        </TabsContent>

        <TabsContent value='followers'>
          {/* ★ FollowersList に targetUserId を渡す ★ */}
          <FollowersList targetUserId={targetUserDbId} />
        </TabsContent>

        {/* 所有者のみフォローリクエストタブを表示 */}
        {isOwner && (
          <TabsContent value='requests'>
            {/* ★ FollowRequestsList に targetUserId を渡す ★ */}
            {/* targetUserId はこの場合 loggedInUserDbId と同じはず */}
            <FollowRequestsList targetUserId={targetUserDbId} />
          </TabsContent>
        )}
        {/* ↑↑↑ ここまで ↑↑↑ */}
      </Tabs>
    </div>
  );
}
