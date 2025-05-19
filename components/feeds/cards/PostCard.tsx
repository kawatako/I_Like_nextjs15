// components/feeds/cards/PostCard.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  RepeatIcon,
  ShareIcon,
  MessageCircleIcon,
  Loader2,
} from "@/components/Icons";
import type { FeedItemWithRelations } from "@/lib/types";
import { PostDetail } from "@/components/posts/PostDetail";
import { FeedLikeButton } from "@/components/likes/FeedLikeButton";
import { RetweetQuoteDialog } from "@/components/posts/modals/RetweetQuoteDialog";
import { QuoteCommentModal } from "@/components/posts/modals/QuoteCommentModal";
import { useCardInteraction } from "@/lib/hooks/useCardInteraction";
import CardHeader from "./CardHeader";

interface PostCardProps {
  item: FeedItemWithRelations;
  loggedInUserDbId: string | null;
}

export default function PostCard({ item, loggedInUserDbId }: PostCardProps) {
  const interactionProps = useCardInteraction(item, loggedInUserDbId);

  // ★ フックが null を返した場合 (item が不正など) は何も表示しない ★
  if (!interactionProps) {
    return null;
  }

  const {
    user, // 投稿者情報
    post, // 投稿データ (いいね情報含む)
    createdAt, // 投稿日時
    feedItemId, // FeedItem ID
    isOwner, // 自分の投稿か
    likeTargetType, // いいね対象タイプ ('Post')
    likeTargetId, // いいね対象 ID (post.id)
    initialLiked, // 初期いいね状態
    likeCount, // いいね数
    commentCount, // コメント数
    retweetCount, // リツイート数
    isRetweetDialogOpen, // RTダイアログ開閉状態
    setIsRetweetDialogOpen, // RTダイアログ開閉関数
    isRetweetPending, // RTアクション実行中状態
    handleRetweet, // RT実行関数
    isQuoteModalOpen, // 引用モーダル開閉状態
    setIsQuoteModalOpen, // 引用モーダル開閉関数
    selectedItemForQuote, // 引用対象データ
    handleOpenQuoteModal, // 引用モーダルを開く関数
    isDeleting, // 削除アクション実行中状態
    handleDelete, // 削除実行関数
  } = interactionProps;

  if (item.type !== "POST" || !post) {
    return null; // post が null の可能性もあるのでチェックは残す
  }

  return (
    // カード全体の div (padding は中の要素で調整)
    <div className='flex space-x-3 border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50 px-4 pt-4'>
      {" "}
      {/* 上と横の padding を追加 */}
      {/* Content (Avatar は CardHeader が表示) */}
      <div className='flex-1 space-y-1'>
        {/* ★★★ Header 部分を CardHeader コンポーネントに置き換え ★★★ */}
        <CardHeader
          user={user}
          createdAt={createdAt}
          feedItemId={feedItemId}
          isOwner={isOwner} // 自分の投稿かのフラグを渡す
          onDelete={handleDelete} // 削除実行関数を渡す
          isDeleting={isDeleting} // 削除中かの状態を渡す
        />

        {/* Post 本体 (Link でラップ) */}
        <div className='pt-2'>
          {feedItemId && post && (
            <Link
              href={`/feeds/${feedItemId}`}
              className='block cursor-pointer hover:bg-gray-50/30 dark:hover:bg-gray-800/30 rounded -mx-1 px-1 transition-colors duration-100 ease-in-out'
            >
              <PostDetail post={post} />
            </Link>
          )}
        </div>

        <div className='flex justify-start pt-2 text-gray-500 dark:text-gray-400'>
          {likeTargetId && likeTargetType && (
            <FeedLikeButton
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
            <span className='text-xs'>{commentCount}</span>
          </Button>
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
      {/* ★ quotedFeedItem の型を調整 ★ */}
      {selectedItemForQuote && selectedItemForQuote.quotedFeedItem && (
        <QuoteCommentModal
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
          quotedFeedItem={selectedItemForQuote as FeedItemWithRelations} // 仮アサーション
        />
      )}
      {selectedItemForQuote && ( // selectedItemForQuote があれば Modal を描画準備
        <QuoteCommentModal
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
          quotedFeedItem={selectedItemForQuote} // 引用「したい」アイテム
        />
      )}
    </div>
  );
}
