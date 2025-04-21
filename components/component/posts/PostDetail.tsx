// components/component/posts/PostDetail.tsx
import type { PostWithData } from "@/lib/types"; // 型は受け取るが、使うのは content だけかも

// ★ Props の型をシンプルにすることも検討 (今は PostWithData のまま) ★
interface PostProps {
  post: PostWithData; // または { content: string | null; imageUrl?: string | null } など
}

export function PostDetail({ post }: PostProps) {
  // ★ ヘッダーとフッターの JSX を削除し、本文表示のみにする ★
  return (
    <div className='space-y-2'> {/* 本文と画像の間のスペース用 */}
      {/* content が null でないことを確認 */}
      <p className='text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words'>
        {post.content ?? ""}
      </p>
      {/* TODO: 画像表示 (post.imageUrl があれば) */}
      {/* {post.imageUrl && (
        <div className="mt-2">
          <img src={post.imageUrl} alt="投稿画像" className="rounded-lg border max-h-96 w-auto" />
        </div>
      )} */}
    </div>
  );
}