// app/rankings/[listId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getRankingDetailsForView } from "@/lib/data/rankingQueries";
import { RankingView } from "@/components/component/rankings/RankingView";

interface RankingDetailPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default async function RankingDetailPage(
  props: RankingDetailPageProps
) {
  const { listId } = await props.params;
  const { userId: loggedInUserId } = await auth();

  // 閲覧用のランキングデータを取得
  const rankingData = await getRankingDetailsForView(listId);

  // データがない場合や閲覧権限がない場合（例：下書き）は 404
  if (!rankingData) {
    notFound();
  }

  // 所有者かどうかを判定 (rankingData に creatorId が含まれている必要あり)
  const isOwner = loggedInUserId === rankingData.author.id;

  return (
    <>
      {/* 所有者であれば編集ボタンを表示 */}
      {isOwner && (
        <div className='mb-6 flex justify-end'>
          <Link href={`/rankings/${listId}/edit`} passHref>
            <Button variant='outline'>編集する</Button>
          </Link>
        </div>
      )}
      <RankingView ranking={rankingData} />
    </>
  );
}
