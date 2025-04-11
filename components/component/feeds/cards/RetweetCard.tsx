// components/component/feeds/cards/RetweetCard.tsx

import Link from 'next/link';
import type { FeedItemWithRelations } from '@/lib/data/feedQueries';
import { RepeatIcon } from '@/components/component/Icons'; // 自作アイコンをインポート
import PostCard from './PostCard'; // 既存のカードをインポート
import RankingUpdateCard from './RankingUpdateCard'; // 既存のカードをインポート

interface RetweetCardProps {
  item: FeedItemWithRelations; // リツイートを表す FeedItem データ
}

export default function RetweetCard({ item }: RetweetCardProps) {
  // タイプが違う、またはリツイート元のデータがない場合は表示しない
  if (item.type !== 'RETWEET' || !item.retweetOfFeedItem) {
    // エラーをログに出力するか、開発中にわかりやすく表示しても良い
    console.warn('Invalid data for RetweetCard:', item);
    return null;
  }

  const retweeter = item.user; // リツイートしたユーザー
  const originalItem = item.retweetOfFeedItem; // リツイート元の FeedItem データ

  // リツイート元の FeedItem の type に応じて表示するカードを決定
  const OriginalCardComponent = () => {
    switch (originalItem.type) {
      case 'POST':
        // 元が投稿なら PostCard を表示
        // 注意: PostCard 内部では originalItem.user (元投稿者) などが使われる
        return <PostCard item={originalItem} />;
      case 'RANKING_UPDATE':
        // 元がランキング更新なら RankingUpdateCard を表示
        return <RankingUpdateCard item={originalItem} />;
      // --- 今後、他のタイプのリツイートも対応する場合に追加 ---
      // case 'RETWEET': // リツイートのリツイートを表示する場合など (複雑になる可能性)
      //   return <RetweetCard item={originalItem} />;
      default:
        console.warn("RetweetCard: Unsupported original item type:", originalItem.type);
        // 表示できない元のタイプの場合は、何らかのフォールバック表示
        return <div className="p-4 text-sm text-red-500">リツイート元のコンテンツを表示できません (Type: {originalItem.type})</div>;
    }
  };

  return (
    <div className="border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
      {/* Retweet Header */}
      <div className="flex items-center space-x-2 px-4 pt-2 pb-1 text-sm text-gray-500 dark:text-gray-400">
        <RepeatIcon className="h-4 w-4" />
        <Link href={`/profile/${retweeter.username}`} className="font-semibold hover:underline">
          {retweeter.name ?? retweeter.username}
        </Link>
        <span>さんがリツイート</span>
      </div>

      {/* Original Content */}
      {/* 元のカードをそのままレンダリング */}
      <OriginalCardComponent />
    </div>
  );
}