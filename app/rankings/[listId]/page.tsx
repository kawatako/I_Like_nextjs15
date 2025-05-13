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
   params
   }:{
    params : Promise<{ listId: string }> 
   }){
  const { listId } = await params;

  // 1) ランキングデータ取得
  const raw = await getRankingDetailsForView(listId);
  if (!raw) return notFound();

  // 2) 作者プロフィール取得
  const userProfileData = await getUserProfileData(raw.author.username);
  if (!userProfileData) return notFound();

  // 3) フォロー状態 etc...
  const { userId: clerkId } = await auth();
  const loggedInDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;
  const isOwner = loggedInDbId === userProfileData.id;
  const followStatusInfo = await getFollowStatus(loggedInDbId, userProfileData.id);

  // 4) 署名付き URL を発行
  const extractKey = (url: string) => {
    try {
      const u = new URL(url);
      const prefix = "/storage/v1/object/public/i-like/";
      return u.pathname.startsWith(prefix) ? u.pathname.slice(prefix.length) : null;
    } catch {
      return null;
    }
  };

  // ヘッダー画像
  const headerImageUrl = userProfileData.image
    ? await generateImageUrl("i-like", extractKey(userProfileData.image)!)
    : null;
  const headerCoverUrl = userProfileData.coverImageUrl
    ? await generateImageUrl("i-like", extractKey(userProfileData.coverImageUrl)!)
    : null;

  // アイテム画像
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => {
      if (!item.imageUrl?.startsWith("blob:")) {
        const key = extractKey(item.imageUrl!);
        if (key) {
          item.imageUrl = await generateImageUrl("i-like", key);
        }
      }
      return item;
    })
  );

  // コンポーネントに渡す
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
