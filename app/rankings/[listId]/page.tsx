// app/rankings/[listId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button'; // shadcn/ui の Button を想定
// ★ 新しく作成する関数: 公開されたランキング詳細を取得 (creatorId も含む)
import { getRankingDetailsForView } from '@/lib/actions/rankingActions';
// ★ 新しく作成するコンポーネント: 閲覧用の表示コンポーネント
import { RankingListView } from '@/components/component/rankings/RankingListView';

interface RankingDetailPageProps {
  params: {
    listId: string; // edit ページに合わせて listId を使用
  };
}

export default async function RankingDetailPage({ params }: RankingDetailPageProps) {
  const { listId } = params;
  const { userId: loggedInUserId } = await auth(); // 現在のログインユーザーIDを取得

  // 閲覧用のランキングデータを取得 (公開済みリストのみ等、ここで制御)
  const rankingData = await getRankingDetailsForView(listId);

  // データがない場合や閲覧権限がない場合（例：下書き）は 404
  if (!rankingData) {
    notFound();
  }

  // 所有者かどうかを判定 (rankingData に creatorId が含まれている必要あり)
  const isOwner = loggedInUserId === rankingData.author.clerkId;

  return (
    <div className="container mx-auto p-4">
      {/* 所有者であれば編集ボタンを表示 */}
      {isOwner && (
        <div className="mb-6 flex justify-end"> {/* ボタンを右上に配置する例 */}
          <Link href={`/rankings/${listId}/edit`} passHref>
            <Button variant="outline">編集する</Button>
          </Link>
        </div>
      )}

      {/* 閲覧用コンポーネントでランキング詳細を表示 */}
      <RankingListView ranking={rankingData} />

      {/* 必要であればコメントセクションなどを追加 */}
    </div>
  );
}