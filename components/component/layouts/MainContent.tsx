// components/component/layout/MainContent.tsx
import PostForm from "../posts/PostForm"; // パスが正しいか確認
import TimelineFeed from "../feeds/TimelineFeed"; // 新しい TimelineFeed をインポート
import type { FeedItemWithRelations } from '@/lib/data/feedQueries'; // 型をインポート

// UserData インターフェース (username は string と仮定)
interface UserData {
  id: string;
  username: string; // スキーマに合わせて null ではないと仮定
  name: string | null;
  image: string | null;
}

// Props の型定義
interface MainContentProps {
  currentLoginUserData: UserData; // PostForm で使う想定
  initialFeedItems: FeedItemWithRelations[];
  initialNextCursor: string | null;
}

export default function MainContent({
  currentLoginUserData,
  initialFeedItems,
  initialNextCursor,
}: MainContentProps) {
  return (
    // h-full で高さを親に合わせ、内部でスクロール可能にする
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col h-full">
      {/* 投稿フォームエリア (高さは固定) */}
      <div className="mb-3 flex-shrink-0">
        <PostForm /* currentLoginUserData={currentLoginUserData} */ />
      </div>
      {/* タイムラインエリア (残りの高さを使い、内部でスクロール) */}
      <div className="flex-1 overflow-y-auto">
        <TimelineFeed
          initialItems={initialFeedItems}
          initialNextCursor={initialNextCursor}
        />
      </div>
    </div>
  );
}