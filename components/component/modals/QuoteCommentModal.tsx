// components/component/modals/QuoteCommentModal.tsx
"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useSWRConfig } from 'swr';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, XIcon } from "@/components/component/Icons"; // アイコンインポート
import { useToast } from "@/components/hooks/use-toast";
import { quoteRetweetAction } from "@/lib/actions/feedActions"; // Server Action
import type { ActionResult, FeedItemWithRelations } from "@/lib/types";
import { QuotedItemPreview } from "@/components/component/feeds/cards/QuotedItemPreview"; // 引用元プレビュー
import { useImageUploader } from "@/components/hooks/useImageUploader"; // 画像アップロードフック
import Image from "next/image"; // 画像表示用

interface QuoteCommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotedFeedItem: FeedItemWithRelations | null;
}

export function QuoteCommentModal({
  open,
  onOpenChange,
  quotedFeedItem,
}: QuoteCommentModalProps) {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition(); // Server Action 実行中
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadImage, isLoading: isUploading, error: uploadError } = useImageUploader(); // 画像アップロードフック

  // モーダルが開閉したときに state をリセット
  useEffect(() => {
    if (!open) {
      setComment("");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  // ファイル選択ハンドラ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "ファイルエラー", description: "画像ファイルを選択してください。", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setPreviewUrl(reader.result as string); };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null); setPreviewUrl(null);
    }
  };

  // 画像削除ハンドラ
  const handleRemoveImage = () => {
    setSelectedFile(null); setPreviewUrl(null);
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  };

  // 「投稿」ボタンのクリック処理
  const handleSubmit = useCallback(async () => {
    if (!quotedFeedItem || !quotedFeedItem.id) {
      toast({ title: "エラー", description: "引用元の情報が見つかりません。", variant: "destructive" });
      return;
    }
    const trimmedComment = comment.trim();
    if (trimmedComment.length === 0 && !selectedFile) {
       toast({ title: "投稿エラー", description: "コメントを入力するか画像を選択してください。", variant: "destructive" });
       return;
    }
    if (trimmedComment.length > 280) {
       toast({ title: "投稿エラー", description: "コメントは280文字以内で入力してください。", variant: "destructive" });
       return;
    }

    let imageUrl: string | null | undefined = undefined;

    startTransition(async () => {
      try {
        // 画像アップロード
        if (selectedFile) {
          imageUrl = await uploadImage(selectedFile);
          if (!imageUrl) return; // アップロード失敗 (エラーはフック内で Toast 表示されるはず)
        }
        // Server Action 呼び出し
        const result = await quoteRetweetAction(quotedFeedItem.id, {
          commentContent: trimmedComment,
          imageUrl: imageUrl,
        });
        if (result.success) {
          toast({ title: "引用リツイートを投稿しました" });
          onOpenChange(false); // モーダルを閉じる (useEffect でリセットされる)
          mutate((key) => Array.isArray(key) && key[0] === 'timelineFeed', undefined, { revalidate: true });
        } else {
          throw new Error(result.error || "投稿に失敗しました");
        }
      } catch (error) {
        toast({ title: "エラー", description: error instanceof Error ? error.message : "投稿できませんでした", variant: "destructive" });
      }
    });
  }, [comment, selectedFile, quotedFeedItem, uploadImage, onOpenChange, startTransition, mutate, toast]);

  // 引用元がない場合は何も表示しない (またはローディング)
  if (!quotedFeedItem) return null;

  const isSubmitDisabled = isPending || isUploading || (comment.trim().length === 0 && !selectedFile) || comment.length > 280;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>引用リツイートを作成</DialogTitle>
        </DialogHeader>

        {/* 引用元のプレビュー */}
        <div className="max-h-40 overflow-y-auto my-2"> {/* my-2 で上下に少しマージン */}
           <QuotedItemPreview originalItem={quotedFeedItem} />
        </div>

        {/* コメント入力エリア */}
        <div className="py-2"> {/* padding 調整 */}
          <Textarea
            placeholder="コメントを追加..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={280}
            disabled={isPending || isUploading} // アップロード中も無効化
            className="resize-none"
          />
          <p className={`text-xs mt-1 text-right ${comment.length > 280 ? 'text-red-500' : 'text-muted-foreground'}`}> {/* text-right で右寄せ */}
            {comment.length} / 280
          </p>
        </div>

        {/* 画像プレビュー */}
        {previewUrl && (
          <div className="relative w-fit mb-2"> {/* mb-2 で下にマージン */}
            <Image src={previewUrl} alt="Preview" width={80} height={80} className="rounded-md object-cover" /> {/* サイズ調整 */}
            <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-black/50 text-white rounded-full hover:bg-black/70" onClick={handleRemoveImage} disabled={isPending || isUploading}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* フッターボタン */}
        <DialogFooter className="items-center gap-2"> {/* gap-2 でボタン間に隙間 */}
           {/* 画像選択ボタン */}
           <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isPending || isUploading || !!selectedFile} title="画像を追加">
              <ImagePlus className="h-5 w-5 text-primary"/>
           </Button>
           <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isPending || isUploading} />

           <div className="flex-grow"></div> {/* 右寄せのためのスペーサー */}

           <DialogClose asChild><Button type="button" variant="outline" disabled={isPending || isUploading}>キャンセル</Button></DialogClose>
           <Button type="button" onClick={handleSubmit} disabled={isSubmitDisabled}>
             {(isPending || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
             {(isPending || isUploading) ? "処理中..." : "投稿する"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}