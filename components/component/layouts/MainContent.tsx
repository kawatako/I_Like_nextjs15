// components/component/layout/MainContent.tsx
import PostForm from "../posts/PostForm";
import { ProfileTabs } from "../profile/ProfileTabs"; // ProfileTabs をインポート
import type { PostWithData, RankingSnippetForProfile } from "@/lib/types"; // 型をインポート

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
        targetUserId={targetUserData.id} // ★ userId={...} を targetUserId={...} に変更 ★
        username={targetUserData.username}
        initialPublishedLists={publishedLists}
        publishedNextCursor={null} // 仮: page.tsx から渡す必要あり
        initialDraftLists={draftLists}
        draftNextCursor={null} // 仮: page.tsx から渡す必要あり
        userPosts={userPosts}
        likedPosts={likedPosts}
        isCurrentUser={isCurrentUser}
        loggedInUserDbId={currentLoginUserDbId} // ログインユーザーのDB IDを渡す
      />
    </div>
  );
}