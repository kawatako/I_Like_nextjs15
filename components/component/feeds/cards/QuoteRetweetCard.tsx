// components/component/feeds/cards/QuoteRetweetCard.tsx
"use client";

import { useState, useTransition, useCallback, SVGProps } from "react"; // useCallback 追加
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageCircleIcon,
  RepeatIcon,
  ShareIcon,
  TrashIcon,
  PenSquareIcon, // RetweetQuoteDialog で使う可能性のあるアイコン
} from "@/components/component/Icons";
import FeedInteraction from "@/components/component/likes/FeedInteraction";
import type { FeedItemWithRelations, ActionResult } from "@/lib/types"; // ActionResult インポート
// import type { PostWithData } from "@/lib/types"; // 推論可能
// import type { RankingListForCard } from "@/lib/data/feedQueries"; // 推論可能
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
// ★ アクションをインポート ★
import {
  deleteQuoteRetweetAction,
  retweetAction,
} from "@/lib/actions/feedActions";
import { useToast } from "@/components/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FeedType } from "@prisma/client";
// ★ PostDetail と RetweetQuoteDialog をインポート ★
import { PostDetail } from "@/components/component/posts/PostDetail";
import { RetweetQuoteDialog } from "@/components/component/modals/RetweetQuoteDialog";
import { Loader2 } from "lucide-react";

// --- 引用元プレビュー用コンポーネント ---
type QuotedItemType = NonNullable<FeedItemWithRelations["quotedFeedItem"]>;

// ★ QuotedItemPreview を export ★
export function QuotedItemPreview({
  originalItem,
}: {
  originalItem: QuotedItemType;
}) {
  if (!originalItem) return null;
  const originalUser = originalItem.user;
  const originalPost = originalItem.post;
  const originalRankingList = originalItem.rankingList;
  let originalLink = "#";
  if (originalItem.type === FeedType.POST && originalItem.id) {
    originalLink = `/feeds/${originalItem.id}`;
  } else if (
    originalItem.type === FeedType.RANKING_UPDATE &&
    originalItem.rankingListId
  ) {
    originalLink = `/rankings/${originalItem.rankingListId}`;
  } else if (originalItem.id) {
    originalLink = `/feeds/${originalItem.id}`;
  }

  return (
    <Link
      href={originalLink}
      className='mt-2 block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700'
    >
      {" "}
    </Link>
  );
}

// --- Props ---
interface QuoteRetweetCardProps {
  item: FeedItemWithRelations;
  loggedInUserDbId: string | null;
}

// --- QuoteRetweetCard 本体 ---
export default function QuoteRetweetCard({
  item,
  loggedInUserDbId,
}: QuoteRetweetCardProps) {
  // ★ フック呼び出しを先頭に ★
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isRetweetDialogOpen, setIsRetweetDialogOpen] = useState(false);
  const [isRetweetPending, startRetweetTransition] = useTransition();

  // ★★★ useCallback もフックなので if 文の前に移動 ★★★
  // 依存配列内で item を使うため、関数内で item が存在するかチェックするとより安全
  const handleDelete = useCallback(() => {
    // item が期待する型か、必要なプロパティを持つかなどを確認
    if (!item || item.type !== "QUOTE_RETWEET" || !item.id) return;
    const feedItemId = item.id; // ここで ID を取得
    startDeleteTransition(async () => {
      try {
        const result = await deleteQuoteRetweetAction(feedItemId);
        if (result.success) {
          toast({ title: "引用リツイートを削除しました。" });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast({ title: "削除エラー", /*...*/ variant: "destructive" });
      }
    });
  }, [item, startDeleteTransition, toast]); // item を依存配列に追加

  const handleRetweet = useCallback(() => {
    if (!item || item.type !== "QUOTE_RETWEET" || !item.id) return;
    const feedItemId = item.id;
    startRetweetTransition(async () => {
      try {
        const result = await retweetAction(feedItemId);
        if (result.success) {
          toast({ title: "リポストしました" });
          setIsRetweetDialogOpen(false);
        } else {
          throw new Error(result.error || "リポスト失敗");
        }
      } catch (error) {
        toast({ title: "エラー", /*...*/ variant: "destructive" });
        setIsRetweetDialogOpen(false);
      }
    });
  }, [item, startRetweetTransition, toast, setIsRetweetDialogOpen]); // item, setIsRetweetDialogOpen を依存配列に追加

  const handleOpenQuoteModal = useCallback(() => {
    if (!item || item.type !== "QUOTE_RETWEET" || !item.id) return;
    const feedItemId = item.id;
    console.log("Quote button clicked for QUOTE_RETWEET FeedItem:", feedItemId);
    toast({ title: "引用機能は現在準備中です" });
    setIsRetweetDialogOpen(false);
  }, [item, toast, setIsRetweetDialogOpen]); // item, setIsRetweetDialogOpen を依存配列に追加
  // ★★★ フック呼び出しここまで ★★★

  // タイプガード (フック呼び出しの後なら OK)
  if (item.type !== "QUOTE_RETWEET" || !item.post || !item.quotedFeedItem) {
    return null;
  }

  const {
    user,
    post: quoteCommentPost,
    createdAt,
    id: feedItemId,
    _count: feedCounts,
  } = item;
  const originalItem = item.quotedFeedItem;
  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });
  const initialLiked = loggedInUserDbId
    ? quoteCommentPost.likes?.some(
        (like) => like.userId === loggedInUserDbId
      ) ?? false
    : false;
  const likeCount = quoteCommentPost.likeCount ?? 0;
  const commentCount = quoteCommentPost._count?.replies ?? 0;
  const retweetCount = feedCounts?.retweets ?? 0;
  const isOwner = loggedInUserDbId === item.userId;

  return (
    <div className='flex space-x-3 border-b p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar className='w-10 h-10'>...</Avatar>
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
          <Link
            href={`/feeds/${feedItemId}`}
            className='text-gray-500 dark:text-gray-400 hover:underline'
          >
            <time dateTime={new Date(item.createdAt).toISOString()}>
              {timeAgo}
            </time>
          </Link>
          {isOwner /* 削除ボタン */ && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='ml-auto h-7 w-7'
                  disabled={isDeleting}
                >
                  <TrashIcon className='h-4 w-4 text-muted-foreground hover:text-destructive' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    引用リツイートを削除しますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>...</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  {/* ★ handleDelete を onClick に設定 ★ */}
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "削除中..." : "削除する"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {/* Body: Quote Comment */}
        <PostDetail post={quoteCommentPost} /> {/* PostDetail を使用 */}
        {/* Quoted Item Preview */}
        <QuotedItemPreview originalItem={originalItem} />
        {/* Footer: Action Buttons */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          <FeedInteraction
            targetType='Post'
            targetId={quoteCommentPost.id}
            likeCount={likeCount}
            initialLiked={initialLiked}
          />
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-blue-500'
          >
            <MessageCircleIcon className='h-[18px] w-[18px]' />
            <span className='text-xs'>{commentCount}</span>
          </Button>
          {/* ★ リツイートボタン修正 ★ */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
            onClick={() => setIsRetweetDialogOpen(true)} // ← ダイアログを開く
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
      {/* Retweet/Quote Dialog */}
      {/* ★ ダイアログを配置 ★ */}
      <RetweetQuoteDialog
        open={isRetweetDialogOpen}
        onOpenChange={setIsRetweetDialogOpen}
        onRetweet={handleRetweet} // ★ handleRetweet を渡す ★
        onQuote={handleOpenQuoteModal} // ★ handleOpenQuoteModal を渡す ★
      />
    </div>
  );
}
