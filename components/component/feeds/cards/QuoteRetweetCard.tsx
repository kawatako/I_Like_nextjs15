// components/component/feeds/cards/QuoteRetweetCard.tsx
"use client";
import { FeedType } from "@prisma/client"; // FeedType をインポート
import { useState, useTransition, useCallback, SVGProps } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageCircleIcon,
  RepeatIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/component/Icons";
import FeedInteraction from "@/components/component/likes/FeedInteraction"; // いいね・コメント用
import type { FeedItemWithRelations } from "@/lib/types";
import type { RankingList } from "@prisma/client"; // RankingList 型
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
// ★ 引用リツイート削除アクションをインポート ★
import { deleteQuoteRetweetAction } from "@/lib/actions/feedActions"; // または適切なパス
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
} from "@/components/ui/alert-dialog"; // ★ 削除確認ダイアログ用 ★

// --- 引用元プレビュー用コンポーネント (内部または別ファイル) ---
// ★ FeedItemWithRelations['quotedFeedItem'] は Optional なので型ガードが必要 ★
// ★ originalItem の型も payload に合わせて調整が必要になる可能性 ★
type QuotedItemType = NonNullable<FeedItemWithRelations["quotedFeedItem"]>; // NonNullable で null/undefined を除去

function QuotedItemPreview({ originalItem }: { originalItem: QuotedItemType }) {
  // タイプガード (より安全に)
  if (!originalItem) return null;

  const originalUser = originalItem.user;
  const originalPost = originalItem.post;
  const originalRankingList = originalItem.rankingList;

  // 引用元の詳細ページへのリンク
  let originalLink = "";
  if (originalItem.type === FeedType.POST && originalItem.id) {
    // 元が POST なら、その FeedItem の詳細ページへ
    originalLink = `/feeds/${originalItem.id}`;
  } else if (
    originalItem.type === FeedType.RANKING_UPDATE &&
    originalItem.rankingListId
  ) {
    // 元が RANKING_UPDATE なら、その RankingList の詳細ページへ
    originalLink = `/rankings/${originalItem.rankingListId}`;
  } else if (originalItem.type === FeedType.QUOTE_RETWEET && originalItem.id) {
    // 元が QUOTE_RETWEET なら、その FeedItem の詳細ページへ
    originalLink = `/feeds/${originalItem.id}`;
  } else if (originalItem.type === FeedType.RETWEET && originalItem.id) {
    // 元が RETWEET なら、そのリツイート自体の FeedItem 詳細ページへ (挙動は要検討)
    // もしくは、リツイート元を辿って表示する？ ここでは一旦 FeedItem 詳細へ
    originalLink = `/feeds/${originalItem.id}`;
  } else {
    // フォールバック (またはリンクなしにする)
    originalLink = "#"; // リンクしない場合は '#' や onClick で制御
    console.warn("Could not determine link for quoted item:", originalItem);
  }

  return (
    <Link
      href={originalLink}
      className='mt-2 block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700'
    >
      <div className='flex items-center space-x-2 text-sm mb-1'>
        <Avatar className='h-5 w-5'>
          <AvatarImage src={originalUser.image ?? undefined} />
          <AvatarFallback>
            {originalUser.name
              ? originalUser.name.charAt(0).toUpperCase()
              : originalUser.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className='font-semibold text-gray-800 dark:text-gray-200'>
          {originalUser.name ?? originalUser.username}
        </span>
        <span className='text-gray-500 dark:text-gray-400'>
          @{originalUser.username}
        </span>
        <time
          dateTime={new Date(originalItem.createdAt).toISOString()}
          className='text-gray-500 dark:text-gray-400 text-xs ml-auto'
        >
          {" "}
          {/* ml-auto で右寄せ */}
          {new Date(originalItem.createdAt).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
      {/* 引用元のコンテンツ */}
      {originalItem.type === "POST" && originalPost && (
        <p className='text-sm text-gray-600 dark:text-gray-400 line-clamp-3'>
          {originalPost.content}
        </p>
      )}
      {originalItem.type === "RANKING_UPDATE" && originalRankingList && (
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          [👑] {originalRankingList.subject}
        </p>
      )}
      {/* 他のタイプもプレビューするならここに追加 */}
    </Link>
  );
}

// --- Props ---
interface QuoteRetweetCardProps {
  item: FeedItemWithRelations; // 引用リツイート FeedItem
  loggedInUserDbId: string | null; // ログインユーザー DB ID
}

// --- QuoteRetweetCard 本体 ---
export default function QuoteRetweetCard({
  item,
  loggedInUserDbId,
}: QuoteRetweetCardProps) {
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition(); // 削除処理中の状態

  // タイプガードとデータ存在チェック
  if (item.type !== "QUOTE_RETWEET" || !item.post || !item.quotedFeedItem) {
    console.warn("Invalid data for QuoteRetweetCard:", item);
    return null;
  }

  const user = item.user; // 引用RTしたユーザー
  const quoteCommentPost = item.post; // 引用コメント (PostWithData 型のはず)
  const originalItem = item.quotedFeedItem; // 引用元 FeedItem

  const timeAgo = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // ★ いいね機能のための Props を準備 (引用コメント Post に対して) ★
  const initialLiked = loggedInUserDbId
    ? quoteCommentPost.likes?.some(
        (like) => like.userId === loggedInUserDbId
      ) ?? false
    : false;
  const likeCount = quoteCommentPost.likeCount ?? 0;
  const commentCount = quoteCommentPost._count?.replies ?? 0;
  const retweetCount = item._count?.retweets ?? 0;


  // ★ 削除処理ハンドラ ★
  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteQuoteRetweetAction(item.id); // この FeedItem の ID を渡す
        if (result.success) {
          toast({ title: "引用リツイートを削除しました。" });
          // TODO: タイムラインからこのカードを削除する処理 (State 更新 or 再検証)
          // 例: 親コンポーネントに削除イベントを通知するコールバックを渡す
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast({
          title: "削除エラー",
          description:
            error instanceof Error ? error.message : "削除に失敗しました。",
          variant: "destructive",
        });
      }
    });
  };

  // ログインユーザーがこの引用RTの投稿者か
  const isOwner = loggedInUserDbId === item.userId;

  return (
    <div className='flex space-x-3 border-b p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar className='w-10 h-10'>
            {" "}
            {/* サイズ統一 */}
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
            dateTime={new Date(item.createdAt).toISOString()}
            className='text-gray-500 dark:text-gray-400 hover:underline'
          >
            {timeAgo}
          </time>
          {/* ★ 自分の投稿なら削除ボタン表示 ★ */}
          {isOwner && (
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
                  <AlertDialogDescription>
                    この操作は元に戻せません。引用コメントとタイムライン項目が完全に削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
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
        <p className='text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words'>
          {quoteCommentPost.content}
        </p>

        {/* Quoted Item Preview */}
        <QuotedItemPreview originalItem={originalItem} />

        {/* Footer: Action Buttons */}
        <div className='flex justify-start pt-2 -ml-2'>
          {" "}
          {/* 左寄せ */}
          <FeedInteraction
            targetType='Post'
            targetId={quoteCommentPost.id} // ★ 引用コメント Post の ID ★
            likeCount={likeCount}
            initialLiked={initialLiked}
          />
          {/* ★ コメントボタンとカウントを FeedInteraction とは別に配置 ★ */}
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-blue-500">
             <MessageCircleIcon className="h-[18px] w-[18px]" />
             <span className="text-xs">{commentCount}</span> {/* コメント数はここで表示 */}
           </Button>
          {/* リツイートボタン (この引用RT自体を対象とする) */}
          <Button
            variant='ghost'
            size='sm'
            className='flex items-center space-x-1 hover:text-green-500'
          >
            <RepeatIcon className='h-[18px] w-[18px]' />
            {/* ★ 引用RTのリツイート数は FeedItem の _count を使う必要あり ★ */}
            <span>{item._count?.retweets ?? 0}</span>
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
