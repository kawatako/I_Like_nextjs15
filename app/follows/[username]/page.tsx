// app/follows/[username]/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getUserByUsername,
  getUserDbIdByClerkId,
} from "@/lib/data/userQueries";
import { FollowingList } from "@/components/component/follows/FollowingList";
import { FollowersList } from "@/components/component/follows/FollowersList";
import { FollowRequestsList } from "@/components/component/follows/FollowRequestsList";

interface FollowsPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function FollowsPage(props: FollowsPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { username: targetUsername } = params;
  const { userId: loggedInClerkId } = await auth();
  const targetUser = await getUserByUsername(targetUsername);
  if (!targetUser) {
    notFound();
  }
  const targetUserDbId = targetUser.id;
  if (!loggedInClerkId) {
    throw new Error("User is not logged in.");
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(loggedInClerkId);
  const isOwner = loggedInUserDbId === targetUserDbId;

  const validTabs = ["following", "followers"];
  if (isOwner) {
    validTabs.push("requests");
  }
  const defaultTab =
    typeof searchParams.tab === "string" && validTabs.includes(searchParams.tab)
      ? searchParams.tab
      : "following";

  return (
    <>
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
        <TabsContent value='following'>
          <FollowingList targetUserId={targetUserDbId} />
        </TabsContent>

        <TabsContent value='followers'>
          <FollowersList targetUserId={targetUserDbId} />
        </TabsContent>

        {isOwner && (
          <TabsContent value='requests'>
            <FollowRequestsList targetUserId={targetUserDbId} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
