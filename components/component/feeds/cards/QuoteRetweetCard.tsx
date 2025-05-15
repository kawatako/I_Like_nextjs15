// components/component/feeds/cards/QuoteRetweetCard.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageCircleIcon,
  RepeatIcon,
  ShareIcon,
  Loader2,
} from "@/components/component/Icons";
import type { FeedItemWithRelations } from "@/lib/types";
import { PostDetail } from "@/components/component/posts/PostDetail";
import { FeedLike } from "@/components/component/likes/FeedLike";
import { RetweetQuoteDialog } from "@/components/component/modals/RetweetQuoteDialog";
import { QuoteCommentModal } from "@/components/component/modals/QuoteCommentModal";
import { useCardInteraction } from "@/components/hooks/useCardInteraction";
import CardHeader from "./CardHeader";
import { QuotedItemPreview } from "./QuotedItemPreview";

// Props
interface QuoteRetweetCardProps {
  item: FeedItemWithRelations;
  loggedInUserDbId: string | null;
}

export default function QuoteRetweetCard({
  item,
  loggedInUserDbId,
}: QuoteRetweetCardProps) {
  // カスタムフック呼び出し
  const interactionProps = useCardInteraction(item, loggedInUserDbId);

  if (
    !interactionProps ||
    !interactionProps.post ||
    !interactionProps.originalItem
  ) {
    return null;
  }

  // フックから必要な値を取得
  const {
    user,
    post: quoteCommentPost,
    createdAt,
    feedItemId,
    isOwner,
    likeTargetType,
    likeTargetId,
    initialLiked,
    likeCount,
    commentCount,
    retweetCount,
    originalItem, // originalItem も取得
    isRetweetDialogOpen,
    setIsRetweetDialogOpen,
    isRetweetPending,
    handleRetweet,
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    selectedItemForQuote,
    handleOpenQuoteModal,
    isDeleting,
    handleDelete,
  } = interactionProps;

  // タイプガード (念のため)
  if (item.type !== "QUOTE_RETWEET") {
    return null;
  }

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
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />

        {/* Body: Quote Comment & Preview */}
        <div className='pt-2'>
          <PostDetail post={quoteCommentPost} />
          {/* ★ originalItem を QuotedItemPreview に渡す ★ */}
          <QuotedItemPreview originalItem={originalItem} />
        </div>

        {/* Footer: Action Buttons */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          {likeTargetId && likeTargetType && (
            // ★ FeedLike にリネームしたコンポーネントを呼び出し ★
            <FeedLike
              targetType={likeTargetType}
              targetId={likeTargetId}
              likeCount={likeCount}
              initialLiked={initialLiked}
            />
          )}
          <Button variant='ghost' size='sm' className='...'>
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{commentCount}</span>
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='...'
            onClick={() => setIsRetweetDialogOpen(true)}
            disabled={isRetweetPending}
          >
            {isRetweetPending ? <Loader2 /> : <RepeatIcon />}
            <span className='text-xs'>{retweetCount}</span>
          </Button>
          <Button variant='ghost' size='icon' className='...'>
            <ShareIcon />
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
          // もしくは Modal 側で selectedItemForQuote を受け取る
        />
      )}

      {selectedItemForQuote && (
        <QuoteCommentModal
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
          quotedFeedItem={selectedItemForQuote} // ★ 引用対象の FeedItem を渡す ★
        />
      )}
    </div>
  );
}
