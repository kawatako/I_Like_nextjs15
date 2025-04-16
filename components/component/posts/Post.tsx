// components/component/posts/Post.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import CommentList from "../comments/CommentList"; // CommentList の実装に合わせて調整
import { ClockIcon } from "@/components/component/Icons"; // ★ 自作アイコンをインポート ★
// import PostInteraction from "../likes/PostInteraction"; // パスを確認
import Link from "next/link";
import type { PostWithData } from "@/lib/data/postQueries"; // ★ 型のインポート元を変更 ★
import { formatDistanceToNowStrict } from 'date-fns'; // ★ 日時フォーマット用 ★
import { ja } from 'date-fns/locale'; // ★ 日本語ロケール ★

// ★ Props の型を修正 ★
interface PostProps {
  post: PostWithData;
}

export default function Post({ post }: PostProps) { // ★ 型を適用 ★

  // 投稿日時のフォーマット
  const timeAgo = post.createdAt ? formatDistanceToNowStrict(new Date(post.createdAt), {
    addSuffix: true,
    locale: ja,
  }) : '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-b"> {/* border-b を追加 */}
      <div className="flex items-center gap-4 mb-4">
        {/* author が null でないことを確認 (通常 postPayload で取得されるはず) */}
        {post.author && (
            <Link href={`/profile/${post.author.username}`}>
            <Avatar className="w-10 h-10">
                {/* post.author.image が null の場合のフォールバックも考慮 */}
                <AvatarImage src={post.author.image ?? undefined} />
                <AvatarFallback>
                    {post.author.name ? post.author.name.charAt(0).toUpperCase() : post.author.username.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            </Link>
        )}
        <div>
          {/* author が null でないことを確認 */}
          {post.author && (
              <>
                <h3 className="text-lg font-semibold">{post.author.name ?? post.author.username}</h3>
                <p className="text-sm text-muted-foreground">@{post.author.username}</p>
              </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {/* content が null でないことを確認 */}
        <p className="whitespace-pre-wrap break-words">{post.content ?? ''}</p>
        {/* TODO: 画像表示 (post.imageUrl があれば) */}
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {/* likes の型を確認して map を使用 */}
          {/* <PostInteraction
            postId={post.id}
            initialLikes={post.likes?.map(like => like.userId) ?? []} // likes が存在する場合のみ map
            commentNumber={post._count?.replies ?? 0} // _count が存在する場合のみアクセス
          /> */}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"> {/* text-xs に変更 */}
          <ClockIcon className="h-4 w-4" /> {/* サイズを h-4 w-4 に変更 */}
          {/* フォーマットされた日時を表示 */}
          <time dateTime={post.createdAt ? new Date(post.createdAt).toISOString() : undefined}>{timeAgo}</time>
        </div>
      </div>
      {/* CommentList の表示ロジックは見直しが必要 */}
      {/* {post.comments && <CommentList replies={post.replies} />} */}
    </div>
  );
}