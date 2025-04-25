// app/profile/[username]/tabs/FeedTab.tsx
import {ProfileTimelineFeed} from "@/components/component/profiles/ProfileTimelineFeed"; // ★ インポートパス修正 ★

interface FeedTabProps {
  targetUserId: string; // page.tsx から渡される
  loggedInUserDbId: string | null; // page.tsx から渡される
}

// RSC として定義
export default function FeedTab({ targetUserId, loggedInUserDbId }: FeedTabProps) {
  return (
    <ProfileTimelineFeed // ★ 呼び出すコンポーネント名を変更 ★
      targetUserId={targetUserId}
      loggedInUserDbId={loggedInUserDbId}
    />
  );
}