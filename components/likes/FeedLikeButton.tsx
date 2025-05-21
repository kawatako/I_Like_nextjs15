// components/likes/FeedLikeButton.tsx
"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSWRConfig } from "swr";
import { HeartIcon } from "@/components/Icons";
import {
  likePostAction,
  likeRankingListAction,
} from "@/lib/actions/likeActions";
import { useToast } from "@/lib/hooks/use-toast";

interface FeedLikeProps {
  targetType: "Post" | "RankingList";
  targetId: string;
  likeCount: number;
  initialLiked: boolean;
}

export function FeedLikeButton({
  targetType,
  targetId,
  likeCount: propCount,
  initialLiked: propLiked,
}: FeedLikeProps) {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // ネイティブ useState で楽観更新
  const [liked, setLiked] = useState(propLiked);
  const [count, setCount] = useState(propCount);

  // ① マウント時にログ
  useEffect(() => {
    console.log("🌟 FeedLikeButton mounted:", {
      targetType,
      targetId,
      propLiked,
      propCount,
    });
  }, []);

  // prop 変化でリセット
  useEffect(() => {
    setLiked(propLiked);
    setCount(propCount);
  }, [propLiked, propCount]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // ここでのみ伝搬とデフォルトを止める
    e.stopPropagation();
    e.preventDefault();

    console.log("✅ FeedLikeButton.handleClick fired", {
      targetType,
      targetId,
      liked,
      count,
    });

    const next = !liked;
    // 楽観更新
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    // サーバーアクション
    startTransition(async () => {
      try {
        const result =
          targetType === "Post"
            ? await likePostAction(targetId)
            : await likeRankingListAction(targetId);

        console.log("🔔 likeAction result:", result);
        if (!result.success) throw new Error(result.error || "いいね失敗");

        // homeFeed/profileFeed のみ再検証
        await mutate(
          (key: any) =>
            Array.isArray(key) &&
            (key[0] === "homeFeed" || key[0] === "profileFeed"),
          undefined,
          { revalidate: true }
        );
      } catch (err: any) {
        console.error("🔥 like toggle error:", err);
        // ロールバック
        setLiked(propLiked);
        setCount(propCount);
        toast({
          title: "エラー",
          description: err.message || "いいねに失敗しました",
          variant: "destructive",
        });
      }
    });
  };

  // プレーンな <button> で動作確認
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
    >
      <HeartIcon
        className={`h-[18px] w-[18px] ${
          liked ? "fill-current text-red-500" : ""
        }`}
      />
      <span className="text-xs">{count}</span>
    </button>
  );
}
