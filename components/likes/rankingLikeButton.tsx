// components/likes/RankingLikeButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { startTransition, useOptimistic } from "react";
import { HeartIcon } from "@/components/Icons";
import { likeRankingListAction } from "@/lib/actions/likeActions";

interface LikeButtonProps {
  listId: string;
  likeCount: number;
  title? : string;
}

export function RankingLikeButton({ listId, likeCount }: LikeButtonProps) {
  const router = useRouter();

  // ① 初期値としてサーバーから渡された likeCount をセット
  // ② reducer: action（今回渡すのは更新後の数値）をそのまま state にする
  const [optimisticCount, dispatchOptimistic] = useOptimistic(
    likeCount,
    (state, action: number) => action
  );

  const handleClick = () => {
    // 1. Optimistic にすぐ +1 して見た目を先行更新
    dispatchOptimistic(optimisticCount + 1);

    // 2. サーバーアクションを起動
    startTransition(() => {
      likeRankingListAction(listId).then(() => {
        // 3. 本来の最新値を反映するためにリフレッシュ
        router.refresh();
      });
    });
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1"
      aria-label="いいねトグル"
    >
      <HeartIcon className="h-5 w-5" />
      {/* ここを likeCount ではなく optimisticCount に */}
      <span>{optimisticCount}</span>
    </button>
  );
}
