// app/feeds/[feedItemId]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFeedItemDetails } from "@/lib/data/feedQueries";
import { FeedType } from "@prisma/client";
import PostCard from "@/components/component/feeds/cards/PostCard";
import RankingUpdateCard from "@/components/component/feeds/cards/RankingUpdateCard";
import RetweetCard from "@/components/component/feeds/cards/RetweetCard";
import QuoteRetweetCard from "@/components/component/feeds/cards/QuoteRetweetCard";

interface FeedDetailPageProps {
  params: Promise<{feedItemId: string}>;
}

export default async function FeedDetailPage({ params }: FeedDetailPageProps) {
  const { feedItemId } =  await params;
  const { userId: clerkId } = await auth(); // ログインユーザーの Clerk ID を取得

  // ログインユーザーの DB ID を取得 (いいね判定などに使う)
  if (!clerkId) {
    notFound(); // Handle the case where clerkId is null
  }
  const loggedInUserDbId = await getUserDbIdByClerkId(clerkId);

  // ★ 作成した関数で FeedItem の詳細データを取得 ★
  const feedItem = await getFeedItemDetails(feedItemId);

  // データが見つからない場合は 404 ページを表示
  if (!feedItem) {
    notFound();
  }

  // FeedItem のタイプに応じて表示するカードを切り替える
  const renderCard = () => {
    switch (feedItem.type) {
      case FeedType.POST:
        return <PostCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />;
      case FeedType.RANKING_UPDATE:
        return (
          <RankingUpdateCard
            item={feedItem}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      case FeedType.RETWEET:
        // RetweetCard は item.retweetOfFeedItem を表示するが、
        // このページではリツイート自体 (item) をベースに情報を表示する必要がある
        // RetweetCard をそのまま使うか、詳細ページ用に表示を調整するか検討
        return (
          <RetweetCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />
        ); // 仮
      case FeedType.QUOTE_RETWEET:
        return (
          <QuoteRetweetCard
            item={feedItem}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      default:
        return <p className='text-red-500'>不明なフィードタイプです。</p>;
    }
  };

  return (
    // ★ 詳細ページのレイアウト (仮) ★
    // layout.tsx の <main> の中に表示される
    <div className='max-w-xl mx-auto'>
      {" "}
      {/* 例えば中央に幅を制限 */}
      {/* TODO: 「戻る」ボタンなどを追加 */}
      {/* TODO: ページタイトル（例：「投稿」）などを追加 */}
      {/* FeedItem のタイプに応じたカードを表示 */}
      {renderCard()}
      {/* ★ 将来的にコメントセクションなどをここに追加 ★ */}
      <div className='mt-6 border-t pt-6'>
        <h2 className='text-lg font-semibold mb-4'>コメント</h2>
        {/* コメント入力フォーム */}
        {/* コメント一覧 */}
        <p className='text-muted-foreground'>(コメント機能は未実装です)</p>
      </div>
    </div>
  );
}
