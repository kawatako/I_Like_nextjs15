// app/profile/[username]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileData, getUserDbIdByClerkId} from "@/lib/data/userQueries"; // userQueries に getFollowStatus も入れた場合
import { getFollowStatus} from "@/lib/actions/followActions"; // followQueries に入れた場合
import { getDraftRankingLists, type DraftRankingSnippet } from "@/lib/data/rankingQueries";
import { getLikedPosts, type PostWithAuthor } from "@/lib/like/likeService";
import { ProfileHeader } from "@/components/component/profile/ProfileHeader";
import { ProfileTabs } from "@/components/component/profile/ProfileTabs";
import { type RankingSnippetForProfile } from "@/lib/data/userQueries"; // RankingSnippetForProfile をインポート
import { fetchPosts} from '@/lib/data/postQueries'; 

interface ProfilePageProps { params: { username: string }; }

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { userId: currentClerkId } = await auth();

  // --- データ取得 ---
  const userProfileData = await getUserProfileData(username);
  if (!userProfileData) { notFound(); }

  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const targetUserDbId = userProfileData.id; // ★ 対象ユーザーのDB ID
  const loggedInUserDbId = await getUserDbIdByClerkId(currentClerkId); // ★ 閲覧者のDB ID

  // ★★★ フォロー状態を取得 ★★★
  const followStatusInfo = await getFollowStatus(loggedInUserDbId, targetUserDbId);
  // ★★★★★★★★★★★★★★★★

  // フォロー状態が取得できない＝対象ユーザーが存在しないなど、念のためチェック
  if (!followStatusInfo) {
      // 基本的には getUserProfileData で notFound になるはずだが...
      console.error(`Could not determine follow status for ${username}`);
      notFound();
  }


  const userPosts: PostWithAuthor[] = await fetchPosts(targetUserDbId); // userDbId を targetUserDbId に変更
  let likedPosts: PostWithAuthor[] = [];
  if (isCurrentUser) { likedPosts = await getLikedPosts(targetUserDbId); } // userDbId を targetUserDbId に変更
  let draftLists: DraftRankingSnippet[] = [];
  if (isCurrentUser) { draftLists = await getDraftRankingLists(targetUserDbId); } // userDbId を targetUserDbId に変更
  // ------------------

  // --- レンダリング ---
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
      <ProfileHeader
        userProfileData={userProfileData}
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      <ProfileTabs
        userId={targetUserDbId}
        username={userProfileData.username}
        publishedLists={(userProfileData.rankingLists ?? []) as RankingSnippetForProfile[]}
        draftLists={draftLists ?? []}
        userPosts={userPosts ?? []}
        likedPosts={likedPosts ?? []}
        isCurrentUser={isCurrentUser}
      />
    </div>
  );
}