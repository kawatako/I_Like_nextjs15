// components/component/feeds/cards/PostCard.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// ★ Button は FeedInteraction 内で使われる場合が多いので不要かも ★
import { Button } from "@/components/ui/button";
import { RepeatIcon, ShareIcon } from "@/components/component/Icons"; // MessageCircle, Heart は FeedInteraction 内
import type { FeedItemWithRelations } from "@/lib/types"
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
import Post from "@/components/component/posts/Post"; // 本文表示用
import FeedInteraction from "@/components/component/likes/FeedInteraction"; // ★ FeedInteraction をインポート ★

// Props の型定義 (Omit を使用)
type PostCardItem = Omit<
  FeedItemWithRelations,
  "retweetOfFeedItem" | "quotedFeedItem"
>;

interface PostCardProps {
  item: PostCardItem;
  loggedInUserDbId: string | null; // DB ID (CUID) を受け取る
}

export default function PostCard({ item, loggedInUserDbId }: PostCardProps) {
  // タイプガード
  if (item.type !== "POST" || !item.post) {
    return null;
  }

  // データの分割代入 (可読性のため)
  const { user, post, createdAt, id: feedItemId } = item; // item から必要な情報を抽出
  const { likes, _count: postCounts } = post; // post からいいねとカウントを抽出 (_count がある前提)
  const { _count: feedCounts } = item; // FeedItem のカウント (_count.retweets など)

  // 日時フォーマット
  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // ★ FeedInteraction に渡す props を計算 ★
  const initialLiked = loggedInUserDbId
    ? likes?.some((like) => like.userId === loggedInUserDbId) ?? false // post.likes を参照
    : false;
  const likeCount = postCounts?.likes ?? 0; // ★ post._count.likes を参照 ★
  const commentCount = postCounts?.replies ?? 0; // ★ post._count.replies を参照 ★
  const retweetCount = feedCounts?.retweets ?? 0; // ★ item._count.retweets を参照 ★
  // 引用数は item.quoteRetweetCount を使う (スキーマで定義した場合)
  // const quoteCount = item.quoteRetweetCount ?? 0;

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
          {/* TODO: 投稿詳細ページへのリンク */}
          <time
            dateTime={new Date(createdAt).toISOString()}
            className='text-gray-500 dark:text-gray-400 hover:underline'
          >
            {timeAgo}
          </time>
          {/* TODO: 自分の投稿なら削除ボタン */}
        </div>
        {/* Post 本体 */}
        <Post post={post} />{" "}
        {/* Post コンポーネントはいいね等を表示しない前提 */}
        {/* Footer: Action Buttons */}
        {/* ★ FeedInteraction と他のボタンを配置 ★ */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          <FeedInteraction
            targetType='Post' // ★ いいね対象は 'Post' ★
            targetId={post.id} // ★ Post の ID を渡す ★
            likeCount={likeCount}
            initialLiked={initialLiked}
            commentCount={commentCount}
            // loggedInUserDbId={loggedInUserDbId} // FeedInteraction には不要
          />
          {/* リツイートボタン (FeedInteraction から分離) */}
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
