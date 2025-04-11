// components/component/layout/MainContent.tsx
import PostForm from "../posts/PostForm";
import { ProfileTabs } from "../profile/ProfileTabs"; // ProfileTabs をインポート
import type { RankingSnippetForProfile } from "@/lib/data/userQueries"; // 型をインポート
import type { PostWithData } from "@/lib/data/postQueries"; // 型をインポート

// UserData インターフェース (username は string と仮定)
interface UserData {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

// Props の型定義を大幅に変更
interface MainContentProps {
  targetUserData: UserData; // プロフィール対象のユーザーデータ
  currentLoginUserDbId: string | null; // ログインユーザーのDB ID (isCurrentUser 判定用)
  publishedLists: RankingSnippetForProfile[];
  draftLists: RankingSnippetForProfile[];
  userPosts: PostWithData[];
  likedPosts: PostWithData[]; // いいねした投稿データ
}

export default function MainContent({
  targetUserData,
  currentLoginUserDbId,
  publishedLists,
  draftLists,
  userPosts,
  likedPosts,
}: MainContentProps) {
  const isCurrentUser = targetUserData.id === currentLoginUserDbId;

  return (
    // h-full と overflow は ProfileTabs 内で管理される想定に変更
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-full">
      {/* プロフィールタブを表示 */}
      <ProfileTabs
        userId={targetUserData.id}
        username={targetUserData.username}
        publishedLists={publishedLists}
        draftLists={draftLists}
        userPosts={userPosts}
        likedPosts={likedPosts} // いいねした投稿を渡す
        isCurrentUser={isCurrentUser}
      />
    </div>
  );
}