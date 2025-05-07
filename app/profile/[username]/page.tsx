// app/profile/[username]/page.tsx

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader";
import ProfileTabsClient from "./tabs/ProfileTabsClient"; // Client Component for Tabs UI

interface ProfilePageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }

  export default async function ProfilePage({
      params,
      searchParams,
    }: ProfilePageProps) {
      // Promise を解決してから使う
      const { username } = await params;
      const sp = await searchParams;

  const { userId: currentClerkId } = await auth();

  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) notFound();

  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const targetUserDbId = userProfileData.id;
  const loggedInUserDbId = currentClerkId ? await getUserDbIdByClerkId(currentClerkId) : null;
  const followStatusInfo = await getFollowStatus(loggedInUserDbId, targetUserDbId);

  const currentTab = typeof sp.tab === "string" ? (sp.tab as "title" | "item" | "tag") : undefined;

  return (
    <>
      <ProfileHeader
        userProfileData={userProfileData}
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      <ProfileTabsClient
        username={userProfileData.username}
        isCurrentUser={isCurrentUser}
        initialTab={currentTab}
        targetUserId={targetUserDbId}
        loggedInUserDbId={loggedInUserDbId}
      />
    </>
  );
}
