// components/component/likes/FeedInteraction.tsx
//主な責任: 特定のコンテンツ（投稿 または ランキングリスト）に対するユーザーインタラクション（いいね、コメント数表示、将来的にはリツイートや共有も）の UI とその動作ロジック
"use client";

import { useTransition, useOptimistic } from "react"; // useOptimistic をインポート
import { Button } from "@/components/ui/button";
import {
  HeartIcon
} from "@/components/component/Icons"; // パスを確認
import {
  likePostAction,
  unlikePostAction,
  likeRankingListAction,
  unlikeRankingListAction,
} from "@/lib/actions/likeActions"; // アクションのパスを確認
import { useToast } from "@/components/hooks/use-toast";

interface FeedInteractionProps {
  targetType: "Post" | "RankingList"; // ★ いいね対象のタイプ ★
  targetId: string; // ★ 対象の ID (postId または rankingListId) ★
  likeCount: number; // 初期いいね数
  initialLiked: boolean; // 初期いいね状態
  // commentCount: number; // コメント数
  // ★ 将来の拡張用 ★
  // retweetCount?: number;
  // quoteCount?: number;
}

export default function FeedInteraction({
  targetType,
  targetId,
  likeCount,
  initialLiked,
  //commentCount,
}: // retweetCount = 0, // 将来用
// quoteCount = 0,  // 将来用
FeedInteractionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [optimisticLiked, setOptimisticLiked] = useOptimistic(initialLiked, (_, newState: boolean) => newState);
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(likeCount, (state, change: number) => state + change);

  const handleLikeToggle = async () => {
    startTransition(async () => {
      const newOptimisticLiked = !optimisticLiked;
      const likeChange = newOptimisticLiked ? 1 : -1;
      setOptimisticLiked(newOptimisticLiked);
      setOptimisticLikeCount(likeChange);
      try {
        let result;
        if (targetType === 'Post') {
          const action = newOptimisticLiked ? likePostAction : unlikePostAction;
          result = await action(targetId);
        } else if (targetType === 'RankingList') {
          const action = newOptimisticLiked ? likeRankingListAction : unlikeRankingListAction;
          result = await action(targetId);
        } else { throw new Error("Unsupported target type"); }
        if (!result?.success) { toast({ title: "エラー", description: result?.error || "いいね失敗", variant: "destructive" }); }
      } catch (error) { /* ... エラー Toast ... */ }
    });
  };

  // ★ いいねボタンとカウントのみを返す ★
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`flex items-center space-x-1 ${
        optimisticLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
      }`}
      onClick={handleLikeToggle}
      disabled={isPending}
    >
      <HeartIcon
        className={`h-[18px] w-[18px] ${
          optimisticLiked ? 'fill-current' : ''
        }`}
      />
      <span className="text-xs">{optimisticLikeCount}</span>
    </Button>
  );
}