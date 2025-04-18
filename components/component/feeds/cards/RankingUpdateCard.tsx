// components/component/feeds/cards/RankingUpdateCard.tsx
"use client"; // ★ Client Component にする ★

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  StarIcon,
  RepeatIcon,
  ShareIcon,
  MessageCircleIcon,
} from "@/components/component/Icons";
import { Button } from "@/components/ui/button";
import type { FeedItemWithRelations } from "@/lib/types";
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
import type { Prisma } from "@prisma/client"; // ★ Prisma, Sentiment, ListStatus もインポート ★
import { Sentiment, ListStatus } from "@prisma/client";
import FeedInteraction from "@/components/component/likes/FeedInteraction"; // ★ FeedInteraction をインポート ★

// ★ items 配列の要素の型を定義 (PostCard と同じものは共通化も検討) ★
const rankedItemSelectForCard = {
  id: true,
  rank: true,
  itemName: true,
  imageUrl: true,
} satisfies Prisma.RankedItemSelect;
type RankedItemSnippet = Prisma.RankedItemGetPayload<{
  select: typeof rankedItemSelectForCard;
}>;

//Props で受け取る item の型を定義 (Omit を使用)
type RankingUpdateCardItem = Omit<
  FeedItemWithRelations,
  "retweetOfFeedItem" | "quotedFeedItem"
>;

// Props の型定義に loggedInUserDbId を追加
interface RankingUpdateCardProps {
  item: RankingUpdateCardItem;
  loggedInUserDbId: string | null;
}

export default function RankingUpdateCard({
  item,
  loggedInUserDbId,
}: RankingUpdateCardProps) {
  // タイプガードとデータ存在チェック
  if (item.type !== "RANKING_UPDATE" || !item.rankingList) {
    return null;
  }

  // データの分割代入
  const user = item.user;
  const rankingList = item.rankingList; //
  const { createdAt, id: feedItemId } = item;
  const { _count: feedCounts } = item;

  // 日時フォーマット
  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // ★ FeedInteraction に渡す props を計算 (対象は RankingList) ★
  const initialLiked = loggedInUserDbId
    ? rankingList.likes?.some((like) => like.userId === loggedInUserDbId) ??
      false
    : false;
  const likeCount = rankingList.likeCount ?? 0; // ★ rankingList._count.likes を参照 ★
  const commentCount = 0; // ランキング更新へのコメントは現状なし
  const retweetCount = feedCounts?.retweets ?? 0; // この FeedItem のリツイート数

  const sentimentLabel =
    rankingList.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";

  return (
    <div className='flex space-x-3 border-b p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar className='w-10 h-10'>
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* Content */}
      <div className='flex-1 space-y-1'>
        {/* Header */}
        <div className='flex items-center space-x-1 text-sm'>
          <Link
            href={`/profile/${user.username}`}
            className='font-semibold hover:underline'
          >
            {user.name ?? user.username}
          </Link>
          <span className='text-gray-500 dark:text-gray-400'>
            @{user.username}
          </span>
          <span className='text-gray-500 dark:text-gray-400'>·</span>
          <time
            dateTime={new Date(createdAt).toISOString()}
            className='text-gray-500 dark:text-gray-400 hover:underline'
          >
            {timeAgo}
          </time>
          {/* TODO: 自分のアクティビティなら削除ボタン */}
        </div>

        {/* Body: Ranking Info */}
        <div className='mt-1'>
          <p className='text-gray-600 dark:text-gray-400 mb-2 flex items-center'>
            <StarIcon
              className='h-4 w-4 inline mr-1 text-yellow-500'
              fill='currentColor'
            />{" "}
            「<span className='font-semibold'>{rankingList.subject}</span>
            」ランキングを
            {/* 公開時と更新時で微妙に createdAt がズレる可能性があるので、 status で判定する方が確実かも？ */}
            {rankingList.status === ListStatus.PUBLISHED &&
            rankingList.createdAt.getTime() === createdAt.getTime()
              ? "公開"
              : "更新"}
            しました
          </p>

          <Link
            href={`/rankings/${rankingList.id}`}
            className='block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700'
          >
            <h3 className='font-semibold text-base mb-1 text-gray-800 dark:text-gray-200'>
              <span className='mr-1'>{sentimentLabel}</span>{" "}
              {/* 感情ラベルも追加 */}
              {rankingList.subject}
            </h3>
            {rankingList.description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                {" "}
                {rankingList.description}{" "}
              </p>
            )}
            <ul className='space-y-1'>
              {/* ★ map の引数に型注釈を追加 ★ */}
              {rankingList.items?.map((rankedItem: RankedItemSnippet) => (
                <li key={rankedItem.id} className='flex items-center text-sm'>
                  <span className='font-semibold mr-2 w-4 text-right'>
                    {rankedItem.rank}.
                  </span>
                  {rankedItem.imageUrl && (
                    <Image
                      src={rankedItem.imageUrl}
                      alt={rankedItem.itemName}
                      width={20}
                      height={20}
                      className='rounded-sm object-cover mr-2'
                    />
                  )}
                  <span className='text-gray-700 dark:text-gray-300'>
                    {rankedItem.itemName}
                  </span>
                </li>
              ))}
              {/* item の総数を _count から取得して比較 */}
              {rankingList._count?.items &&
                rankingList.items &&
                rankingList._count.items > rankingList.items.length && (
                  <li className='text-xs text-gray-500 dark:text-gray-400 pt-1'>
                    {" "}
                    ... もっと見る ({rankingList._count.items}件)
                  </li>
                )}
            </ul>
          </Link>
        </div>

        {/* Footer: Action Buttons */}
        {/* ★ FeedInteraction と他のボタンを配置 ★ */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          <FeedInteraction
            targetType='RankingList' // ★ いいね対象は 'RankingList' ★
            targetId={rankingList.id} // ★ RankingList の ID を渡す ★
            likeCount={likeCount}
            initialLiked={initialLiked}
          />
          {/* ★ コメントボタンとカウントを FeedInteraction とは別に配置 ★ */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-blue-500'
          >
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{commentCount}</span>{" "}
            {/* コメント数はここで表示 */}
          </Button>
          {/* リツイートボタン */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
          >
            <RepeatIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{retweetCount}</span>{" "}
            {/* item._count.retweets を表示 */}
          </Button>
          {/* 共有ボタン */}
          <Button variant='ghost' size='icon' className='hover:text-blue-500'>
            <ShareIcon className='h-[18px] w-[18px]' />
          </Button>
        </div>
      </div>
    </div>
  );
}
