// components/component/PostList.tsx
import Post from "./Post";
import type { PostWithData } from "@/lib/types"; // PostWithData 型をインポート

interface PostListProps {
  posts: PostWithData[];
}

export default function PostList({ posts }: PostListProps) {
  if (!posts || posts.length === 0) {
    return null; // 親コンポーネントでメッセージ表示想定
  }

  return (
    // 各 Post コンポーネントの下ボーダーで区切るので space-y は削除しても良いかも
    <div className="space-y-0">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}