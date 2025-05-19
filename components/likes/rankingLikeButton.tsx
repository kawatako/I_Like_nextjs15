// components/likes/rankingLikeButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { HeartIcon } from "@/components/Icons";
import { likeRankingListAction } from "@/lib/actions/likeActions";

interface LikeButtonProps {
  listId: string;
  likeCount: number;
}

export function RankingLikeButton({ listId, likeCount }: LikeButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // サーバーアクションを呼び出し、完了後にページを再フェッチ
    startTransition(() => {
      likeRankingListAction(listId).then(() => {
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
      <span>{likeCount}</span>
    </button>
  );
}
