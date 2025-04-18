// components/component/likes/FeedInteraction.tsx
//主な責任: 特定のコンテンツ（投稿 または ランキングリスト）に対するユーザーインタラクション（いいね、コメント数表示、将来的にはリツイートや共有も）の UI とその動作ロジック
"use client";

import { useTransition, useOptimistic } from "react"; // useOptimistic をインポート
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/component/Icons"; // パスを確認
import {
  likePostAction,
  unlikePostAction,
  likeRankingListAction,
  unlikeRankingListAction,
} from "@/lib/actions/likeActions"; // アクションのパスを確認
import { useToast } from "@/components/hooks/use-toast";
import { useRouter } from "next/navigation";

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
}: //commentCount,
// retweetCount = 0, // 将来用
// quoteCount = 0,  // 将来用
FeedInteractionProps) {
  const { mutate } = useSWRConfig(); // SWR のキャッシュを更新するための関数
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLiked,
    (_, newState: boolean) => newState
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(
    likeCount,
    (state, change: number) => state + change
  );

  const handleLikeToggle = async () => {
    startTransition(async () => {
      const newOptimisticLiked = !optimisticLiked;
      const likeChange = newOptimisticLiked ? 1 : -1;
      setOptimisticLiked(newOptimisticLiked);
      setOptimisticLikeCount(likeChange);

      try {
        let result;
        if (targetType === "Post") {
          const action = newOptimisticLiked ? likePostAction : unlikePostAction;
          result = await action(targetId);
        } else if (targetType === "RankingList") {
          const action = newOptimisticLiked
            ? likeRankingListAction
            : unlikeRankingListAction;
          result = await action(targetId);
        } else {
          throw new Error("Unsupported target type");
        }

        if (!result?.success) {
          toast({
            title: "エラー",
            description: result?.error || "いいね失敗",
            variant: "destructive",
          });
          // useOptimistic がロールバックするはず
        } else {
          // ★★★ アクション成功後に mutate を実行！ ★★★
          // キーが配列で、最初の要素が 'timelineFeed' であるキャッシュを再検証
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed",
            undefined, // 新しいデータを直接渡さず、再検証をトリガー
            { revalidate: true } // 再検証を強制 (デフォルトで true の場合もある)
          );
          // router.refresh(); // ← これはもう不要なはず
          // 成功時の Toast (任意)
          // toast({ title: newOptimisticLiked ? "いいねしました" : "いいねを取り消しました" });
        }
      } catch (error) {
        toast({
          title: "エラー",
          description:
            error instanceof Error
              ? error.message
              : "いいね操作中に予期せぬエラーが発生しました。",
          variant: "destructive",
        });
        // useOptimistic がロールバックするはず
      }
    });
  };

  // ★ いいねボタンとカウントのみを返す ★
  return (
    <Button
      variant='ghost'
      size='sm'
      className={`flex items-center space-x-1 ${
        optimisticLiked
          ? "text-red-500 hover:text-red-600"
          : "hover:text-red-500"
      }`}
      onClick={handleLikeToggle}
      disabled={isPending}
    >
      <HeartIcon
        className={`h-[18px] w-[18px] ${optimisticLiked ? "fill-current" : ""}`}
      />
      <span className='text-xs'>{optimisticLikeCount}</span>
    </Button>
  );
}
