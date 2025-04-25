// app/profile/[username]/page.tsx

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader";
import ProfileTabsClient from "./tabs/ProfileTabsClient"; // Client Component for Tabs UI

interface ProfilePageProps {
  params: { username: string };
  searchParams:  { [key: string]: string | string[] | undefined }
}

export default async function ProfilePage({ params: paramsProp, searchParams: searchParamsProp }: ProfilePageProps) {
  const params = await paramsProp;
  const searchParams = await searchParamsProp;

  const username = params.username;
  const { userId: currentClerkId } = await auth();

  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) notFound();

  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const targetUserDbId = userProfileData.id;
  const loggedInUserDbId = currentClerkId ? await getUserDbIdByClerkId(currentClerkId) : null;
  const followStatusInfo = await getFollowStatus(loggedInUserDbId, targetUserDbId);

  const currentTab = typeof searchParams?.tab === 'string' ? searchParams.tab : undefined;

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
