import Post from "./Post";
import type { PostWithData } from "@/lib/post/postService"; // ★ postService で定義した型をインポート

// ★ Props の型定義: posts 配列を受け取るようにする ★
interface PostListProps {
  posts: PostWithData[];
}

// ★ async を削除し、props で posts を受け取るように変更 ★
export default function PostList({ posts }: PostListProps) {

  // ★ コンポーネント内部でのデータ取得ロジックは削除 ★
  // const { userId } = auth();
  // const posts = await fetchPosts(userId, username);

  // posts が空配列の場合の表示を追加するとより丁寧
  if (!posts || posts.length === 0) {
      // このメッセージは page.tsx 側で制御しているので、ここでは null を返すか、
      // page.tsx 側の分岐を削除してここでメッセージを出すか、どちらかに統一します。
      // return <p className="text-center text-muted-foreground py-8">投稿がありません。</p>;
      return null; // page.tsx 側でメッセージを出す想定
  }

  return (
    // ★ 受け取った posts 配列を map する ★
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      {/* 以前の三項演算子は不要になるか、空配列チェックに変わる */}
    </div>
  );
}