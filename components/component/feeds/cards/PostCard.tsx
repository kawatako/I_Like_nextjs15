// components/component/feeds/cards/PostCard.tsx
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Repeat, Share } from "lucide-react"; // lucide-react アイコンの例
import type { FeedItemWithRelations } from '@/lib/data/feedQueries'; // 型をインポート
import { formatDistanceToNowStrict } from 'date-fns'; // 日時フォーマットの例 (date-fns)
import { ja } from 'date-fns/locale';

type PostCardItem = Omit<FeedItemWithRelations, 'retweetOfFeedItem' | 'quotedFeedItem'>;

interface PostCardProps {
  item: PostCardItem;
}

export default function PostCard({ item }: PostCardProps) {
  // FeedItem の type が POST でない、または post データがない場合は何も表示しない（念のため）
  if (item.type !== 'POST' || !item.post) {
    return null;
  }

  const user = item.user;
  const post = item.post;

  // 日時のフォーマット (例: date-fns を使用)
  const timeAgo = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true, // "前" を付ける
    locale: ja,      // 日本語で表示
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
          {/* TODO: 投稿詳細ページへのリンク */}
          <time dateTime={new Date(item.createdAt).toISOString()} className="text-gray-500 dark:text-gray-400 hover:underline">
            {timeAgo}
          </time>
        </div>

        {/* Body: Post Content */}
        {/* whitespace-pre-wrap で改行やスペースを保持 */}
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {post.content}
        </p>

        {/* TODO: Image (画像がある場合) */}
        {/* {post.imageUrl && (
          <div className="mt-2">
            <img src={post.imageUrl} alt="投稿画像" className="rounded-lg border max-h-96 w-auto" />
          </div>
        )} */}

        {/* Footer: Action Buttons */}
        <div className="flex justify-between pt-2 text-gray-500 dark:text-gray-400">
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-blue-500">
            <MessageCircle size={18} />
            {/* <span>{post._count?.replies ?? 0}</span> */}
            <span>0</span> {/* TODO: 返信数を表示 */}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-green-500">
            <Repeat size={18} />
            {/* <span>{item._count?.retweets ?? 0}</span> */}
             <span>0</span> {/* TODO: リツイート数を表示 */}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:text-red-500">
            <Heart size={18} />
             {/* <span>{post._count?.likes ?? 0}</span> */}
             <span>0</span> {/* TODO: いいね数を表示 */}
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-blue-500">
            <Share size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}