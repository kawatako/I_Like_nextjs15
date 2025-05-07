// app/rankings/[listId]/page.tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getRankingDetailsForView } from "@/lib/data/rankingQueries";
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader";
import { RankingDetailView } from "@/components/component/rankings/RankingDetailView";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ listId: string }>;
}

export default async function RankingDetailPage( props: Props) {
  const { params } = await props
  const { listId } = await params;
  // 1) ランキング本体
  const raw = await getRankingDetailsForView(listId);
  if (!raw) return notFound();

  // 2) 投稿者プロフィール（ヘッダー用）
  const userProfileData = await getUserProfileData(raw.author.username);
  if (!userProfileData) return notFound();

  // 3) isOwner
  const { userId: clerkUserId } = await auth();
  const isOwner = clerkUserId === userProfileData.clerkId;

  // 4) フォロー状態
  const followStatusInfo = await getFollowStatus(
    clerkUserId ? await getUserDbIdByClerkId(clerkUserId) : null,
    userProfileData.id
  );

  return (
    <>
      {/* プロフィールヘッダー */}
      <ProfileHeader
        userProfileData={userProfileData}
        isCurrentUser={isOwner}
        initialFollowStatus={followStatusInfo}
      />
      {/* ランキング詳細 */}
      <RankingDetailView ranking={raw} isOwner={isOwner} />

            {/* オーナーだけに表示する「編集する」 */}
            {isOwner && (
        <div className="mb-4 flex justify-end px-4">
          <Link href={`/rankings/${listId}/edit`}>
            <Button variant="outline">編集する</Button>
          </Link>
        </div>
      )}
    </>
  );
}
