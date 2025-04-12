// app/profile/[username]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getUserProfileData,
  getUserDbIdByClerkId,
  type RankingSnippetForProfile,
} from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
// ★ getProfileRankingsPaginated と ListStatus をインポート ★
import {
  getProfileRankingsPaginated,
  getDraftRankingLists,
} from "@/lib/data/rankingQueries";
import { ListStatus } from "@prisma/client";
// ★ getLikedPosts と PostWithAuthor のインポート元を確認 (今回は使わないかも) ★
// import { getLikedPosts, type PostWithAuthor } from "@/lib/like/likeService";
import { ProfileHeader } from "@/components/component/profile/ProfileHeader";
import { ProfileTabs } from "@/components/component/profile/ProfileTabs";
import { fetchPosts, type PostWithData } from "@/lib/data/postQueries";

interface ProfilePageProps {
  params: { username: string };
}

// ★ プロフィールタブ用のデータ取得件数 ★
const PROFILE_INITIAL_LIMIT = 10; // 無限スクロールの1ページ分と同じ件数が一般的

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { userId: currentClerkId } = await auth();

  // --- ユーザー基本情報とフォロー状態の取得 (変更なし) ---
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
  // --- ここまで変更なし ---

  // --- ★★★ 投稿、いいね、ランキングリストの初期データ取得 (修正) ★★★ ---
  // 1. ユーザーの投稿 (変更なし、ただしページネーション化も将来検討)
  const userPosts: PostWithData[] = await fetchPosts(null, username);

  // 2. いいねした投稿 (変更なし、getLikedPosts は未実装と仮定)
  let likedPosts: PostWithData[] = [];
  // if (isCurrentUser) { likedPosts = await getLikedPosts(targetUserDbId); }

  // 3. 公開済みランキングリスト (★ ページネーションで初期データを取得 ★)
  const { items: initialPublishedLists, nextCursor: publishedNextCursor } =
    await getProfileRankingsPaginated({
      userId: targetUserDbId,
      status: ListStatus.PUBLISHED,
      limit: PROFILE_INITIAL_LIMIT,
      cursor: undefined, // 最初のページ
    });

  // 4. 下書きランキングリスト (★ ページネーションで初期データを取得 - 自分のみ ★)
  let initialDraftLists: RankingSnippetForProfile[] = [];
  let draftNextCursor: string | null = null;
  if (isCurrentUser) {
    const draftData = await getProfileRankingsPaginated({
      // ★ getDraftRankingLists の代わりにこっちを使う ★
      userId: targetUserDbId,
      status: ListStatus.DRAFT,
      limit: PROFILE_INITIAL_LIMIT,
      cursor: undefined,
    });
    initialDraftLists = draftData.items;
    draftNextCursor = draftData.nextCursor;
  }
  // --- ★★★ データ取得ここまで修正 ★★★ ---

  // --- レンダリング ---
  return (
    <div className='container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl'>
      <ProfileHeader
        userProfileData={userProfileData} // 基本情報は getUserProfileData から
        isCurrentUser={isCurrentUser}
        initialFollowStatus={followStatusInfo}
      />
      {/* ★ ProfileTabs に渡す Props を変更 ★ */}
      <ProfileTabs
        targetUserId={targetUserDbId} // ★ 対象ユーザーIDを追加 ★
        username={userProfileData.username}
        // 公開リストの初期データとカーソル
        initialPublishedLists={initialPublishedLists}
        publishedNextCursor={publishedNextCursor}
        // 下書きリストの初期データとカーソル
        initialDraftLists={initialDraftLists}
        draftNextCursor={draftNextCursor}
        // 投稿といいね (変更なし)
        userPosts={userPosts}
        likedPosts={likedPosts}
        isCurrentUser={isCurrentUser}
      />
    </div>
  );
}
