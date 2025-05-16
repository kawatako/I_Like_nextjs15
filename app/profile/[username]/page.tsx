// app/profile/[username]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import { generateImageUrl } from "@/lib/utils/storage";
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader";
import ProfileTabsClient from "./tabs/ProfileTabsClient";
import type { UserProfileData } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 1) Promise を解決
  const { username } = await params;
  const sp = await searchParams;

  // 2) DB からユーザー情報を取得
  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) notFound();

  // 3) 署名付き URL をユーティリティ経由で取得
  const profileImageUrl = await generateImageUrl(userProfileData.image);
  const coverImageUrl   = await generateImageUrl(userProfileData.coverImageUrl);

  // 4) フォロー状態を取得
  const { userId: currentClerkId } = await auth();
  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const loggedInUserDbId = currentClerkId
    ? await getUserDbIdByClerkId(currentClerkId)
    : null;
  const followStatusInfo = await getFollowStatus(
    loggedInUserDbId,
    userProfileData.id
  );

  // 5) 初期タブ
  const currentTab =
    typeof sp.tab === "string" && ["title", "item", "tag"].includes(sp.tab)
      ? (sp.tab as "title" | "item" | "tag")
      : undefined;

  // 6) コンポーネントに渡すデータをマージ
  const headerUserData: UserProfileData = {
    ...userProfileData,
    image: profileImageUrl,
    coverImageUrl,
  };

  return (
    <>
      <ProfileHeader
        userProfileData={headerUserData}
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      <ProfileTabsClient
        username={userProfileData.username}
        isCurrentUser={isCurrentUser}
        initialTab={currentTab}
        targetUserId={userProfileData.id}
        loggedInUserDbId={loggedInUserDbId}
      />
    </>
  );
}
