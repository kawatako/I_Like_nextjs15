// app/rankings/[listId]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getRankingDetailsForView } from "@/lib/data/rankingQueries";
import { getUserProfileData, getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFollowStatus } from "@/lib/actions/followActions";
import { generateImageUrl } from "@/lib/utils/storage";
import { ProfileHeader } from "@/components/component/profiles/ProfileHeader";
import { RankingDetailView } from "@/components/component/rankings/RankingDetailView";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RankingDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  // 1) ランキング本体データ取得
  const raw = await getRankingDetailsForView(listId);
  if (!raw) return notFound();

  // 2) 作者プロフィール取得
  const userProfileData = await getUserProfileData(raw.author.username);
  if (!userProfileData) return notFound();

  // 3) フォロー状態取得
  const { userId: clerkId } = await auth();
  const loggedInDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;
  const isOwner = loggedInDbId === userProfileData.id;
  const followStatusInfo = await getFollowStatus(loggedInDbId, userProfileData.id);

  // 4) プロフィール画像／カバー画像を署名付き URL に
  const headerImageUrl = userProfileData.image
    ? await generateImageUrl(userProfileData.image)
    : null;
  const headerCoverUrl = userProfileData.coverImageUrl
    ? await generateImageUrl(userProfileData.coverImageUrl)
    : null;

  // 5) アイテム画像のパスもすべて署名付き URL に
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl
        ? await generateImageUrl(item.imageUrl)
        : null,
    }))
  );

  // 6) コンポーネントに渡す形を整形
  const headerData = {
    ...userProfileData,
    image: headerImageUrl,
    coverImageUrl: headerCoverUrl,
  };
  const rankingWithSigned = { ...raw, items: itemsWithSigned };

  return (
    <>
      <ProfileHeader
        userProfileData={headerData}
        isCurrentUser={isOwner}
        initialFollowStatus={followStatusInfo}
      />
      <RankingDetailView ranking={rankingWithSigned} isOwner={isOwner} />
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
