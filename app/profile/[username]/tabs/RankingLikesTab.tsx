// app/profile/[username]/tabs/RankingLikesTab.tsx
import LikedRankingList from "@/components/component/profiles/LikedRankingList"; // ★ 作成したクライアントコンポーネントのパスを確認 ★

// Props 型定義
interface RankingLikesTabProps {
  targetUserId: string;       // page.tsx から渡される表示対象ユーザーの DB ID
  loggedInUserDbId: string | null; // page.tsx から渡されるログインユーザーの DB ID
}

// サーバーコンポーネントとして定義 (async は不要)
export default function RankingLikesTab({
  targetUserId,
  loggedInUserDbId
}: RankingLikesTabProps) {

  // データ取得やロジックはこのコンポーネントでは行わず、
  // クライアントコンポーネントに任せる
  return (
    <LikedRankingList
      targetUserId={targetUserId}
      loggedInUserDbId={loggedInUserDbId}
    />
  );
}