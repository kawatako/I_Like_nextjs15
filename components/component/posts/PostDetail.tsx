// components/component/posts/PostDetail.tsx
import type { PostWithData } from "@/lib/types"; // 型は受け取るが、使うのは content だけかも
import Image from 'next/image'; 

// ★ Props の型をシンプルにすることも検討 (今は PostWithData のまま) ★
interface PostProps {
  post: PostWithData; // または { content: string | null; imageUrl?: string | null } など
}

export function PostDetail({ post }: PostProps) { // ★ export default ではなく export function に ★
  return (
    <div className='space-y-2'>
      {/* content が null でないことを確認 */}
      <p className='text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words'>
        {post.content ?? ""}
      </p>
      {/* ★★★ 画像表示部分を追加 ★★★ */}
      {post.imageUrl && ( // imageUrl が存在する場合のみ表示
        <div className="mt-3 relative aspect-video max-h-[400px] w-full overflow-hidden rounded-lg border"> {/* 例: アスペクト比16:9 */}
          <Image
            src={post.imageUrl}
            alt="投稿画像" // より具体的に alt を設定できると良い (例: post.content の一部など)
            fill // 親要素に合わせて画像を表示
            className="object-contain" // 画像全体がコンテナに収まるように表示 (はみ出さない)
            // className="object-cover" // コンテナ全体を画像で覆う (はみ出す部分が出る)
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 70vw, 600px" // 例: レスポンシブなサイズ指定 (任意)
          />
        </div>
      )}
    </div>
  );
}