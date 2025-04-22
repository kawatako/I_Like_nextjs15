// QuotedItemPreview.tsx
// 引用された元のコンテンツの概要(=本文)を表示するコンポーネント
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedType } from "@prisma/client";
import type {
  FeedItemWithRelations,
  PostWithData,
  RankingListSnippet,
  UserSnippet,
} from "@/lib/types";

// 型定義 (元ファイルから移動)
type QuotedItemType = NonNullable<FeedItemWithRelations["quotedFeedItem"]>;

// Props の型
interface QuotedItemPreviewProps {
  originalItem: QuotedItemType;
}

// コンポーネント定義 (元ファイルから移動)
export function QuotedItemPreview({ originalItem }: QuotedItemPreviewProps) {
  // タイプガード (関数冒頭でチェック)
  if (!originalItem || !originalItem.user) {
    console.warn(
      "QuotedItemPreview: Invalid originalItem data received.",
      originalItem
    );
    return (
      <div className='mt-2 block border rounded-lg p-3 text-sm text-muted-foreground italic'>
        引用元の情報を表示できません。
      </div>
    );
  }

  const originalUser = originalItem.user;
  // ★ post や rankingList が null の可能性を考慮 (型アサーションより安全) ★
  const originalPost = originalItem.post ?? null;
  const originalRankingList = originalItem.rankingList ?? null;

  // リンク先決定ロジック
  let originalLink = "#";
  if (originalItem.type === FeedType.POST && originalItem.id) {
    originalLink = `/feeds/${originalItem.id}`;
  } else if (
    originalItem.type === FeedType.RANKING_UPDATE &&
    originalItem.rankingListId
  ) {
    originalLink = `/rankings/${originalItem.rankingListId}`;
  } else if (originalItem.id) {
    // 他のタイプは FeedItem 詳細へ (仮)
    originalLink = `/feeds/${originalItem.id}`;
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
        <span className='font-semibold text-gray-800 dark:text-gray-200 truncate'>
          {originalUser.name ?? originalUser.username}
        </span>{" "}
        {/* truncate 追加 */}
        <span className='text-gray-500 dark:text-gray-400 truncate'>
          @{originalUser.username}
        </span>
        <time
          dateTime={new Date(originalItem.createdAt).toISOString()}
          className='text-gray-500 dark:text-gray-400 text-xs ml-auto flex-shrink-0'
        >
          {" "}
          {/* flex-shrink-0 追加 */}
          {new Date(originalItem.createdAt).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
      {/* 引用元のコンテンツ */}
      {originalItem.type === FeedType.POST && originalPost && (
        <p className='text-sm text-gray-600 dark:text-gray-400 line-clamp-3'>
          {originalPost.content}
        </p>
      )}
      {originalItem.type === FeedType.RANKING_UPDATE && originalRankingList && (
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          [👑] {originalRankingList.subject}
        </p>
      )}
      {/* TODO: 他のタイプ (RETWEET, QUOTE_RETWEET) のプレビュー表示 */}
    </Link>
  );
}
