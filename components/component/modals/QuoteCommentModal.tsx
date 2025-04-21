// components/component/modals/QuoteCommentModal.tsx
"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Close ボタン用
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react"; // ローディングスピナー
import { useToast } from "@/components/hooks/use-toast";
import { quoteRetweetAction } from "@/lib/actions/feedActions"; // Server Action をインポート
import type { ActionResult, FeedItemWithRelations } from "@/lib/types";
import { QuotedItemPreview } from "@/components/component/feeds/cards/QuoteRetweetCard"; // 引用元プレビューコンポーネントをインポート

// ★ Props の型定義 ★
interface QuoteCommentModalProps {
  open: boolean; // ダイアログが開いているか
  onOpenChange: (open: boolean) => void; // 開閉状態を変更する関数
  quotedFeedItem: NonNullable<FeedItemWithRelations["quotedFeedItem"]>; // 引用元の FeedItem データ (プレビュー用)
}

export function QuoteCommentModal({
  open,
  onOpenChange,
  quotedFeedItem, // 引用元データを受け取る
}: QuoteCommentModalProps) {
  const { mutate } = useSWRConfig(); // SWR の mutate を使うためのフック
  const { toast } = useToast();
  const [comment, setComment] = useState(""); // 入力されたコメント用 State
  const [isPending, startTransition] = useTransition(); // Server Action 実行中 State

  // モーダルが開かれたときにコメントをクリアする (任意)
  useEffect(() => {
    if (open) {
      setComment("");
    }
  }, [open]);

  // ★ 「投稿」ボタンのクリック処理 ★
  const handleSubmit = useCallback(async () => {
    const trimmedComment = comment.trim(); // 前後の空白を削除
    startTransition(async () => {
      try {
        console.log(
          `Quoting FeedItem: ${quotedFeedItem.id} with comment: ${comment}`
        );
        const result: ActionResult = await quoteRetweetAction(
          quotedFeedItem.id,
          trimmedComment
        );

        if (result.success) {
          toast({ title: "引用リツイートを投稿しました" });
          onOpenChange(false); // モーダルを閉じる
          setComment(""); // コメントをクリア
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed",
            undefined,
            { revalidate: true } // SWR のキャッシュを再検証
          );
        } else {
          throw new Error(result.error || "投稿に失敗しました");
        }
      } catch (error) {
        toast({
          title: "エラー",
          description:
            error instanceof Error ? error.message : "投稿できませんでした",
          variant: "destructive",
        });
        console.error("Failed to quote retweet:", error);
      }
    });
  }, [
    comment,
    quotedFeedItem.id,
    onOpenChange,
    setComment,
    startTransition,
    mutate,
    toast,
  ]); // ★ 依存配列 ★

  // 投稿ボタンを無効化する条件
  const isSubmitDisabled =
    isPending || comment.trim().length === 0 || comment.length > 280;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>引用リツイートを作成</DialogTitle>
        </DialogHeader>
        <div className='max-h-40 overflow-y-auto'>
          {" "}
          <QuotedItemPreview originalItem={quotedFeedItem} />
        </div>
        <div className='py-4'>
          <Textarea
            placeholder='コメントを追加...'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={280} // 文字数制限
            disabled={isPending}
            className='resize-none'
          />
          <p
            className={`text-xs mt-1 ${
              comment.length > 280 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {comment.length} / 280
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline' disabled={isPending}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {isPending ? "投稿中..." : "投稿する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
