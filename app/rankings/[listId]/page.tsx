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
import { DeleteRankingButton } from "@/components/component/rankings/DeleteRankingButton";

export const dynamic = "force-dynamic";

export default async function RankingDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const raw = await getRankingDetailsForView(listId);
  if (!raw) return notFound();

  // 認証チェック
  const { userId: clerkId } = await auth();
  const loggedInDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;
  const isOwner = loggedInDbId === raw.author.id;
  if (raw.status === "DRAFT" && !isOwner) return notFound();

  // プロフィール画像も署名付き URL に
  const userProfileData = await getUserProfileData(raw.author.username);
  if (!userProfileData) return notFound();
  const headerImageUrl = await generateImageUrl(userProfileData.image);
  const headerCoverUrl = await generateImageUrl(userProfileData.coverImageUrl);

  // ★ 元の item.imageUrl (キー文字列) を署名付き URL に上書き ★
  const items = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl
        ? await generateImageUrl(item.imageUrl)
        : null,
    }))
  );

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
      <RankingDetailView
        ranking={{ ...raw, items }}
        isOwner={isOwner}
      />
      {isOwner && (
        <div className="mb-4 flex justify-end px-4">
          <Link href={`/rankings/${listId}/edit`}>
            <Button variant="outline">編集する</Button>
          </Link>
          <DeleteRankingButton listId={listId} />
        </div>
      )}
    </>
  );
}
