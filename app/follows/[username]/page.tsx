// app/follows/[username]/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserByUsername, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { FollowingList } from "@/components/follows/FollowingList";
import { FollowersList } from "@/components/follows/FollowersList";

interface FollowsPageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowsPage(props: FollowsPageProps) {
  const { username: targetUsername } = await props.params;
  const { userId: loggedInClerkId } = await auth();
  const targetUser = await getUserByUsername(targetUsername);
  if (!targetUser) return notFound();

  const targetUserDbId = targetUser.id;
  if (!loggedInClerkId) throw new Error("ログインしてください。");
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);

  // 自分自身のページならタブは両方見せる（後でもっと絞るなら isOwnerチェック自体を消してOK）
  const defaultTab = "following";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {targetUser.name ?? targetUser.username}
        </h1>
        <Link href={`/profile/${targetUsername}`}>
          <Button variant="outline" size="sm">
            プロフィールへ
          </Button>
        </Link>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="following">フォロー中</TabsTrigger>
          <TabsTrigger value="followers">フォロワー</TabsTrigger>
        </TabsList>
        <TabsContent value="following">
          <FollowingList targetUserId={targetUserDbId} />
        </TabsContent>
        <TabsContent value="followers">
          <FollowersList targetUserId={targetUserDbId} />
        </TabsContent>
      </Tabs>
    </>
  );
}
