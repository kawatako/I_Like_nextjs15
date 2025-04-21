// components/component/feeds/cards/PostCard.tsx
"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  RepeatIcon,
  ShareIcon,
  MessageCircleIcon,
  Loader2,
} from "@/components/component/Icons";
import type { FeedItemWithRelations, ActionResult } from "@/lib/types"; // ★ ActionResult もインポート (必要なら) ★
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
import { PostDetail } from "@/components/component/posts/PostDetail";
import FeedInteraction from "@/components/component/likes/FeedInteraction";
import { retweetAction } from "@/lib/actions/feedActions";
import { RetweetQuoteDialog } from "@/components/component/modals/RetweetQuoteDialog";
import { useToast } from "@/components/hooks/use-toast"; // ★ useToast をインポート ★
import { QuoteCommentModal} from "@/components/component/modals/QuoteCommentModal";

// Props の型定義 (変更なし)
type PostCardItem = Omit<
  FeedItemWithRelations,
  "retweetOfFeedItem" | "quotedFeedItem"
>;
interface PostCardProps {
  item: PostCardItem;
  loggedInUserDbId: string | null;
}

export default function PostCard({ item, loggedInUserDbId }: PostCardProps) {
  const { toast } = useToast();
  const [isRetweetDialogOpen, setIsRetweetDialogOpen] = useState(false);
  const [isRetweetPending, startRetweetTransition] = useTransition();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false); // コメントモーダル用の State
  const [selectedItemForQuote, setSelectedItemForQuote] = useState<
    typeof item | null
  >(null); //引用対象の FeedItem を保持する State

  // ★★★ useCallback もフックなので if 文の前に移動 ★★★
  const handleRetweet = useCallback(() => {
    startRetweetTransition(async () => {
      // この関数内で item.id を使う必要があるが、item はこの時点ではまだ分割代入されていない
      // props として受け取った item を直接参照すればOK
      if (!item || item.type !== "POST" || !item.post) return; //念のためガード
      const feedItemId = item.id; // item.id を使う

      try {
        console.log(`Retweeting FeedItem: ${feedItemId}`);
        const result = await retweetAction(feedItemId);
        if (result.success) {
          toast({ title: "リポストしました" });
          setIsRetweetDialogOpen(false);
          // TODO: mutate
        } else {
          throw new Error(result.error || "リポストに失敗しました");
        }
      } catch (error) {
        toast({ title: "エラー", /*...*/ variant: "destructive" });
        console.error("Failed to retweet:", error);
        setIsRetweetDialogOpen(false);
      }
    });
  }, [item, startRetweetTransition, toast, setIsRetweetDialogOpen]); // ★ item を依存配列に追加 (他のフックも) ★

  const handleOpenQuoteModal = useCallback(() => {
    setSelectedItemForQuote(item);
    setIsQuoteModalOpen(true);
    console.log("Opening quote modal for FeedItem:", item.id);
  }, [item, setIsQuoteModalOpen, setSelectedItemForQuote]); // ★ item と setIsRetweetDialogOpen を依存配列に追加 ★

  // タイプガード (フック呼び出しの後なら OK)
  if (item.type !== "POST" || !item.post) {
    return null;
  }

  // ↓↓↓ フックの後で props や state から値を取り出す ↓↓↓
  const { user, post, createdAt, id: feedItemId } = item; // ← feedItemId はここで定義
  const { likes, _count: postCounts, likeCount: postLikeCount } = post;
  const { _count: feedCounts } = item;
  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });
  const initialLiked = loggedInUserDbId
    ? likes?.some((like) => like.userId === loggedInUserDbId) ?? false
    : false;
  const likeCount = postLikeCount ?? 0;
  const commentCount = postCounts?.replies ?? 0;
  const retweetCount = feedCounts?.retweets ?? 0;

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
          {/* ... (ユーザー名、タイムスタンプリンクなど) ... */}
        </div>

        {/* Post 本体 (Link でラップ) */}
        <Link
          href={`/feeds/${feedItemId}`}
          className='block cursor-pointer ...'
        >
          <PostDetail post={post} />
        </Link>

        {/* Footer: Action Buttons */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          <FeedInteraction
            targetType='Post'
            targetId={post.id}
            likeCount={likeCount}
            initialLiked={initialLiked}
          />
          <Button variant='ghost' size='sm' className='...'>
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{commentCount}</span>
          </Button>

          {/* ★ リツイートボタンに onClick と disabled を追加 ★ */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
            onClick={() => setIsRetweetDialogOpen(true)} // ← ダイアログを開く
            disabled={isRetweetPending} // ← 実行中は無効化
          >
            {/* ★ isRetweetPending ならスピナー表示 (任意) ★ */}
            {isRetweetPending ? (
              <Loader2 className='mr-1 h-4 w-4 animate-spin' />
            ) : (
              <RepeatIcon className='h-[18px] w-[18px]' />
            )}
            <span className='text-xs'>{retweetCount}</span>
          </Button>

          {/* 共有ボタン */}
          <Button variant='ghost' size='icon' className='hover:text-blue-500'>
            <ShareIcon className='h-[18px] w-[18px]' />
          </Button>
        </div>
      </div>

      {/* ★ リツイート/引用選択ダイアログを追加 ★ */}
      <RetweetQuoteDialog
        open={isRetweetDialogOpen}
        onOpenChange={setIsRetweetDialogOpen}
        onRetweet={handleRetweet}
        onQuote={handleOpenQuoteModal}
      />
      {selectedItemForQuote &&
        selectedItemForQuote.post && ( // post がないと QuotedItemPreview でエラーになる可能性
          <QuoteCommentModal
            open={isQuoteModalOpen}
            onOpenChange={setIsQuoteModalOpen}
            quotedFeedItem={
              selectedItemForQuote as NonNullable<FeedItemWithRelations["quotedFeedItem"]>
            }
          />
        )}
    </div>
  );
}
