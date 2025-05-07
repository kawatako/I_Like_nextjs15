// app/profile/[username]/tabs/RankingTab.tsx
import { ProfileRankingLists } from "@/components/component/profiles/ProfileRankingLists";

interface RankingTabProps {
  targetUserId: string;
  username: string; // ProfileRankingListsClient に渡す username
  isCurrentUser: boolean;
}

// RSC として定義 (async は不要)
export default function RankingTab({ targetUserId, username, isCurrentUser }: RankingTabProps) {

  // ProfileRankingListsClient を呼び出し、公開リストを表示するように props を渡す
  return (
    <ProfileRankingLists
      targetUserId={targetUserId}
      username={username}
      status="PUBLISHED"
      isCurrentUser={isCurrentUser}
    />
  );
}