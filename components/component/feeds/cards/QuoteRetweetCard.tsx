// components/component/feeds/cards/QuoteRetweetCard.tsx

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HeartIcon, MessageCircleIcon, RepeatIcon, ShareIcon } from "@/components/component/Icons"; // 自作アイコン
import type { FeedItemWithRelations } from '@/lib/data/feedQueries';
import { formatDistanceToNowStrict } from 'date-fns';
import { ja } from 'date-fns/locale';

interface QuoteRetweetCardProps {
  item: FeedItemWithRelations; // 引用リツイートを表す FeedItem データ
}

// 引用元のプレビューを表示する小さなコンポーネント (内部 or 別ファイル)
function QuotedItemPreview({ originalItem }: { originalItem: FeedItemWithRelations['quotedFeedItem'] }) {
  if (!originalItem) return null;

  const originalUser = originalItem.user;
  const originalPost = originalItem.post;
  const originalRankingList = originalItem.rankingList;

  // 引用元の詳細ページへのリンクパス (仮)
  // 元のタイプによってパスが変わる可能性も考慮 (ここでは FeedItem ID を使う例)
  const originalLink = `/status/${originalItem.id}`; // TODO: 正しいリンク先に修正

  return (
    <Link href={originalLink} className="mt-2 block border rounded-lg p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 dark:border-gray-700">
      <div className="flex items-center space-x-2 text-sm mb-1">
        <Avatar className="h-5 w-5"> {/* 小さめのアバター */}
          <AvatarImage src={originalUser.image ?? undefined} />
          <AvatarFallback>{originalUser.name ? originalUser.name.charAt(0).toUpperCase() : originalUser.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{originalUser.name ?? originalUser.username}</span>
        <span className="text-gray-500 dark:text-gray-400">@{originalUser.username}</span>
        <span className="text-gray-500 dark:text-gray-400">·</span>
        <time dateTime={new Date(originalItem.createdAt).toISOString()} className="text-gray-500 dark:text-gray-400 text-xs">
          {/* 元の投稿日時を簡易表示 */}
          {new Date(originalItem.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
        </time>
      </div>
      {/* 引用元のコンテンツ概要 */}
      {originalItem.type === 'POST' && originalPost && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{originalPost.content}</p> // 3行まで表示例
      )}
      {originalItem.type === 'RANKING_UPDATE' && originalRankingList && (
         <p className="text-sm text-gray-600 dark:text-gray-400">[👑] {originalRankingList.subject}</p>
      )}
      {/* 他のタイプの引用元も必要なら追加 */}
    </Link>
  );
}


export default function QuoteRetweetCard({ item }: QuoteRetweetCardProps) {
  // タイプ違い、引用コメント(post)、引用元(quotedFeedItem)がない場合は表示しない
  if (item.type !== 'QUOTE_RETWEET' || !item.post || !item.quotedFeedItem) {
    console.warn('Invalid data for QuoteRetweetCard:', item);
    return null;
  }

  const user = item.user; // 引用RTしたユーザー
  const quoteCommentPost = item.post; // 引用コメント
  const originalItem = item.quotedFeedItem; // 引用元 FeedItem

  const timeAgo = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true, locale: ja,
  });

  return (
    <div className="flex space-x-3 border-b p-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
      {/* Left: Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar>
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>
              {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* Right: Content */}
      <div className="flex-1 space-y-1">
        {/* Header: User Info & Timestamp */}
        <div className="flex items-center space-x-1 text-sm">
          <Link href={`/profile/${user.username}`} className="font-semibold hover:underline">
            {user.name ?? user.username}
          </Link>
          <span className="text-gray-500 dark:text-gray-400">@{user.username}</span>
          <span className="text-gray-500 dark:text-gray-400">·</span>
          <time dateTime={new Date(item.createdAt).toISOString()} className="text-gray-500 dark:text-gray-400 hover:underline">
            {timeAgo}
          </time>
        </div>

        {/* Body: Quote Comment */}
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {quoteCommentPost.content}
        </p>
        {/* TODO: 引用コメントに画像がある場合の表示 */}
        {/* {quoteCommentPost.imageUrl && ... } */}


        {/* Quoted Item Preview */}
        <QuotedItemPreview originalItem={originalItem} />


        {/* Footer: Action Buttons */}
        {/* この引用リツイート自体に対するアクションボタン */}
        <div className="flex justify-between pt-2 text-gray-500 dark:text-gray-400">
           <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-blue-500">
            <MessageCircleIcon className="h-[18px] w-[18px]" />
            <span>0</span> {/* TODO: この引用RTへの返信数を表示 */}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-green-500">
            <RepeatIcon className="h-[18px] w-[18px]" />
             <span>0</span> {/* TODO: この引用RTのリツイート数を表示 */}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-red-500">
            <HeartIcon className="h-[18px] w-[18px]" />
             <span>0</span> {/* TODO: この引用RTのいいね数を表示 */}
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-blue-500">
            <ShareIcon className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>
    </div>
  );
}