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
  params: { listId: string };
}) {
  const { listId } = params;

  // 1) 下書きも含めてデータ取得
  const raw = await getRankingDetailsForView(listId);
  if (!raw) return notFound();

  // 2) 認証情報取得
  const { userId: clerkId } = await auth();
  const loggedInDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;
  const isOwner = loggedInDbId === raw.author.id;

  // 3) 下書きはオーナー以外アクセス禁止
  if (raw.status === "DRAFT" && !isOwner) {
    return notFound();
  }

  // 4) 作者プロフィール取得
  const userProfileData = await getUserProfileData(raw.author.username);
  if (!userProfileData) return notFound();

  // 5) 画像の署名付き URL 発行
  const headerImageUrl = await generateImageUrl(userProfileData.image);
  const headerCoverUrl = await generateImageUrl(userProfileData.coverImageUrl);
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl ? await generateImageUrl(item.imageUrl) : null,
    }))
  );

  // 6) レンダリング
  return (
    <>
      <ProfileHeader
        userProfileData={{
          ...userProfileData,
          image: headerImageUrl,
          coverImageUrl: headerCoverUrl,
        }}
        isCurrentUser={isOwner}
        initialFollowStatus={await getFollowStatus(loggedInDbId, userProfileData.id)}
      />
      <RankingDetailView ranking={{ ...raw, items: itemsWithSigned }} isOwner={isOwner} />
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
