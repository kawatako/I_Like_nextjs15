// app/profile/[username]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getUserProfileData,
  getUserDbIdByClerkId,
  type RankingSnippetForProfile,
} from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import {
  getProfileRankingsPaginated,
  getDraftRankingLists,
} from "@/lib/data/rankingQueries";
import { ListStatus } from "@prisma/client";
import { ProfileHeader } from "@/components/component/profile/ProfileHeader";
import { ProfileTabs } from "@/components/component/profile/ProfileTabs";
import { fetchPosts, type PostWithData } from "@/lib/data/postQueries";

interface ProfilePageProps {
  params: { username: string };
}

// ★ プロフィールタブ用のデータ取得件数 ★
const PROFILE_INITIAL_LIMIT = 10;

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { userId: currentClerkId } = await auth();

  // --- ユーザー基本情報とフォロー状態の取得
  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) {
    notFound();
  }

  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const targetUserDbId = userProfileData.id;
  const loggedInUserDbId = await getUserDbIdByClerkId(currentClerkId);

  const followStatusInfo = await getFollowStatus(
    loggedInUserDbId,
    targetUserDbId
  );
  if (!followStatusInfo) {
    console.error(`Could not determine follow status for ${username}`);
    notFound();
  }

  const userPosts: PostWithData[] = await fetchPosts(null, username);

  let likedPosts: PostWithData[] = [];

  const { items: initialPublishedLists, nextCursor: publishedNextCursor } =
    await getProfileRankingsPaginated({
      userId: targetUserDbId,
      status: ListStatus.PUBLISHED,
      limit: PROFILE_INITIAL_LIMIT,
      cursor: undefined, 
    });

  let initialDraftLists: RankingSnippetForProfile[] = [];
  let draftNextCursor: string | null = null;
  if (isCurrentUser) {
    const draftData = await getProfileRankingsPaginated({
      userId: targetUserDbId,
      status: ListStatus.DRAFT,
      limit: PROFILE_INITIAL_LIMIT,
      cursor: undefined,
    });
    initialDraftLists = draftData.items;
    draftNextCursor = draftData.nextCursor;
  }

  return (
    <>
      <ProfileHeader
        userProfileData={userProfileData}
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      <ProfileTabs
        targetUserId={targetUserDbId}
        username={userProfileData.username}
        initialPublishedLists={initialPublishedLists}
        publishedNextCursor={publishedNextCursor}
        initialDraftLists={initialDraftLists}
        draftNextCursor={draftNextCursor}
        userPosts={userPosts}
        likedPosts={[]}
        isCurrentUser={isCurrentUser}
      />
    </>
  );
}
