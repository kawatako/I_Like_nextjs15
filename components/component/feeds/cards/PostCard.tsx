// components/component/feeds/cards/PostCard.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"; // Retweet, Share ボタンで使うので残す
import {
  RepeatIcon,
  ShareIcon,
  MessageCircleIcon,
} from "@/components/component/Icons"; // FeedInteraction 以外のアイコン
import type { FeedItemWithRelations } from "@/lib/types"; // ★ 型は lib/types からインポート想定 ★
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
import Post from "@/components/component/posts/Post"; // 本文表示用
import FeedInteraction from "@/components/component/likes/FeedInteraction"; // いいね・コメント用インタラクション

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

  // データの分割代入
  const { user, post, createdAt, id: feedItemId } = item;
  // post から likes, _count, likeCount を取得 (postPayload で select されている前提)
  const { likes, _count: postCounts, likeCount: postLikeCount } = post;
  // item から _count を取得 (feedItemPayload で select されている前提)
  const { _count: feedCounts } = item;

  // 日時フォーマット
  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // FeedInteraction に渡す props を計算
  const initialLiked = loggedInUserDbId
    ? likes?.some((like) => like.userId === loggedInUserDbId) ?? false
    : false;
  // ★ likeCount は post.likeCount を参照 ★
  const likeCount = postLikeCount ?? 0;
  const commentCount = postCounts?.replies ?? 0; // post._count.replies を参照
  const retweetCount = feedCounts?.retweets ?? 0; // item._count.retweets を参照

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
          {/* ... (ユーザー名、タイムスタンプなど) ... */}
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
            <time
              dateTime={new Date(createdAt).toISOString()}
              className='text-gray-500 dark:text-gray-400 hover:underline'
            >
              {timeAgo}
            </time>
          </Link>
          {/* TODO: 自分の投稿なら削除ボタン */}
        </div>

        {/* Post 本体 */}
        <Post post={post} />

        {/* Footer: Action Buttons */}
        <div className='flex justify-start pt-2 -ml-2 text-gray-500 dark:text-gray-400'>
          <FeedInteraction
            targetType='Post'
            targetId={post.id}
            likeCount={likeCount} // ★ 正しいカウントを渡す ★
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
            {/* リツイート数を表示 */}
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
