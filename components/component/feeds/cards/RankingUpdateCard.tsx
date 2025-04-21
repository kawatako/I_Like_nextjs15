// components/component/feeds/cards/RankingUpdateCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  StarIcon,
  RepeatIcon,
  ShareIcon,
  MessageCircleIcon,
  Loader2,
} from "@/components/component/Icons";
import type {
  FeedItemWithRelations,
  ActionResult,
  RankingListSnippet,
} from "@/lib/types"; // 必要な型
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { Sentiment, ListStatus, FeedType } from "@prisma/client"; // ★ FeedType もインポート ★
import { FeedLike } from "@/components/component/likes/FeedLike"; // ★ FeedLike をインポート ★
import { RetweetQuoteDialog } from "@/components/component/modals/RetweetQuoteDialog"; // ★ 追加 ★
import { QuoteCommentModal } from "@/components/component/modals/QuoteCommentModal"; // ★ 追加 ★
import { useCardInteraction } from "@/components/hooks/useCardInteraction"; // ★ カスタムフック ★
import CardHeader from "./CardHeader"; // ★ CardHeader をインポート ★
import { useToast } from "@/components/hooks/use-toast"; // ★ useToast 追加 ★
import { useState, useTransition, useCallback } from "react"; // ★ フックを追加 ★

// items 配列の要素の型
const rankedItemSelectForCard = {
  id: true,
  rank: true,
  itemName: true,
  imageUrl: true,
} satisfies Prisma.RankedItemSelect;
type RankedItemSnippet = Prisma.RankedItemGetPayload<{
  select: typeof rankedItemSelectForCard;
}>;

// Props の型定義
interface RankingUpdateCardProps {
  item: FeedItemWithRelations; // ★ FeedItemWithRelations を直接使用 ★
  loggedInUserDbId: string | null;
}

export default function RankingUpdateCard({
  item,
  loggedInUserDbId,
}: RankingUpdateCardProps) {
  // ★★★ カスタムフックを呼び出す ★★★
  const interactionProps = useCardInteraction(item, loggedInUserDbId);

  // フックが null または必要なデータがない場合は早期リターン
  if (
    !interactionProps ||
    !interactionProps.rankingList ||
    !interactionProps.user ||
    !interactionProps.createdAt ||
    !interactionProps.feedItemId
  ) {
    console.warn(
      "Invalid data for RankingUpdateCard, interactionProps:",
      interactionProps
    );
    return null;
  }

  // ★★★ フックから必要な値と関数を取得 ★★★
  const {
    user,
    rankingList,
    createdAt,
    feedItemId,
    isOwner,
    likeTargetType,
    likeTargetId,
    initialLiked,
    likeCount,
    commentCount, // 常に 0 のはず
    retweetCount,
    isRetweetDialogOpen,
    setIsRetweetDialogOpen,
    isRetweetPending,
    handleRetweet,
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    selectedItemForQuote,
    setSelectedItemForQuote, // ★ 追加 ★
    handleOpenQuoteModal,
    isDeleting,
    handleDelete,
  } = interactionProps;

  // タイプガード (念のため)
  if (item.type !== "RANKING_UPDATE") {
    return null;
  }

  // ★ timeAgo の計算は CardHeader 内にあるが、ここでも必要なら残す ★
  // const timeAgo = formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true, locale: ja });
  const sentimentLabel =
    rankingList.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";

  return (
    <div className='flex space-x-3 border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50 px-4 pt-4'>
      {/* Content */}
      <div className='flex-1 space-y-1'>
        {/* ★★★ Header 部分を CardHeader コンポーネントに置き換え ★★★ */}
        <CardHeader
          user={user}
          createdAt={createdAt}
          feedItemId={feedItemId}
          isOwner={isOwner}
          onDelete={handleDelete} // ランキング更新 FeedItem 削除は未実装だがハンドラは渡す
          isDeleting={isDeleting}
        />

        {/* Body: Ranking Info */}
        <div className='mt-1 pt-2'>
          {" "}
          {/* 上の padding 調整 */}
          <p className='text-gray-600 dark:text-gray-400 mb-2 flex items-center'>
            <StarIcon
              className='h-4 w-4 inline mr-1 text-yellow-500'
              fill='currentColor'
            />{" "}
            「<span className='font-semibold'>{rankingList.subject}</span>
            」ランキングを
            {rankingList.status === ListStatus.PUBLISHED &&
            rankingList.createdAt &&
            createdAt &&
            rankingList.createdAt.getTime() === createdAt.getTime()
              ? "公開"
              : "更新"}
            しました
          </p>
          {/* RankingList プレビュー */}
          <Link
            href={`/rankings/${rankingList.id}`}
            className='block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700'
          >
            <h3 className='font-semibold text-base mb-1 text-gray-800 dark:text-gray-200'>
              <span className='mr-1'>{sentimentLabel}</span>
              {rankingList.subject}
            </h3>
            {rankingList.description && (
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                {" "}
                {rankingList.description}{" "}
              </p>
            )}
            <ul className='space-y-1'>
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
                      className='... object-cover mr-2'
                    />
                  )}
                  <span className='text-gray-700 dark:text-gray-300'>
                    {rankedItem.itemName}
                  </span>
                </li>
              ))}
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
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          {likeTargetId && likeTargetType && (
            // ★ FeedLike を使用 ★
            <FeedLike
              targetType={likeTargetType}
              targetId={likeTargetId}
              likeCount={likeCount}
              initialLiked={initialLiked}
            />
          )}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-blue-500'
          >
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{commentCount}</span> {/* 常に 0 */}
          </Button>
          {/* ★ リツイートボタン (フックの値を使用) ★ */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
            onClick={() => setIsRetweetDialogOpen(true)}
            disabled={isRetweetPending}
          >
            {isRetweetPending ? (
              <Loader2 className='mr-1 h-4 w-4 animate-spin' />
            ) : (
              <RepeatIcon className='h-[18px] w-[18px]' />
            )}
            <span className='text-xs'>{retweetCount}</span>
          </Button>
          <Button variant='ghost' size='icon' className='hover:text-blue-500'>
            <ShareIcon className='h-[18px] w-[18px]' />
          </Button>
        </div>
      </div>

      {/* ダイアログ */}
      <RetweetQuoteDialog
        open={isRetweetDialogOpen}
        onOpenChange={setIsRetweetDialogOpen}
        onRetweet={handleRetweet}
        onQuote={handleOpenQuoteModal}
      />
      {selectedItemForQuote && (
        <QuoteCommentModal
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
          quotedFeedItem={selectedItemForQuote}
        />
      )}
    </div>
  );
}
