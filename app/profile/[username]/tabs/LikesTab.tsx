// app/profile/[username]/tabs/LikesTab.tsx
import LikedFeedList from "@/components/profiles/LikedFeedList"; // ★ 作成したクライアントコンポーネントのパスを確認 ★

// Props 型定義
interface LikesTabProps {
  targetUserId: string;       // page.tsx から渡される表示対象ユーザーの DB ID
  loggedInUserDbId: string | null; // page.tsx から渡されるログインユーザーの DB ID
}

// サーバーコンポーネントとして定義
export default function LikesTab({
  targetUserId,
  loggedInUserDbId
}: LikesTabProps) {

  // データ取得はクライアントコンポーネントに任せる
  return (
    <LikedFeedList
      targetUserId={targetUserId}
      loggedInUserDbId={loggedInUserDbId}
    />
  );
}