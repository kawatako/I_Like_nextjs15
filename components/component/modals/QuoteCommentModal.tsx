// components/component/modals/QuoteCommentModal.tsx
"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useSWRConfig } from "swr";
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
import { Loader2, ImagePlus, XIcon } from "@/components/component/Icons";
import { useToast } from "@/components/hooks/use-toast";
import { quoteRetweetAction } from "@/lib/actions/feedActions";
import type { ActionResult, FeedItemWithRelations } from "@/lib/types";
import { QuotedItemPreview } from "@/components/component/feeds/cards/QuotedItemPreview";
import { useImageUploader } from "@/components/hooks/useImageUploader";
import Image from "next/image";

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
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadImage, isLoading: isUploading } = useImageUploader(); // error removed

  useEffect(() => {
    if (!open) {
      setComment("");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "ファイルエラー", description: "画像ファイルを選択してください。", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = useCallback(async () => {
    if (!quotedFeedItem?.id) {
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

    let imageUrl: string | null = null;

    startTransition(async () => {
      try {
        if (selectedFile) {
          const uploaded = await uploadImage(selectedFile);
          if (!uploaded) return; // フック内でトースト表示
          imageUrl = uploaded.signedUrl; // signedUrl を使う
        }

        const result: ActionResult = await quoteRetweetAction(quotedFeedItem.id, {
          commentContent: trimmedComment,
          imageUrl,
        });
        if (result.success) {
          toast({ title: "引用リツイートを投稿しました" });
          onOpenChange(false);
          mutate((key) => Array.isArray(key) && key[0] === "timelineFeed", undefined, { revalidate: true });
        } else {
          throw new Error(result.error || "投稿に失敗しました");
        }
      } catch (error) {
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : "投稿できませんでした",
          variant: "destructive",
        });
      }
    });
  }, [comment, selectedFile, quotedFeedItem, uploadImage, onOpenChange, startTransition, mutate, toast]);

  if (!quotedFeedItem) return null;

  const isSubmitDisabled =
    isPending ||
    isUploading ||
    (comment.trim().length === 0 && !selectedFile) ||
    comment.length > 280;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>引用リツイートを作成</DialogTitle>
        </DialogHeader>

        <div className="max-h-40 overflow-y-auto my-2">
          <QuotedItemPreview originalItem={quotedFeedItem} />
        </div>

        <div className="py-2">
          <Textarea
            placeholder="コメントを追加..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={280}
            disabled={isPending || isUploading}
            className="resize-none"
          />
          <p
            className={`text-xs mt-1 text-right ${
              comment.length > 280 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {comment.length} / 280
          </p>
        </div>

        {previewUrl && (
          <div className="relative w-fit mb-2">
            <Image src={previewUrl} alt="Preview" width={80} height={80} className="rounded-md object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 bg-black/50 text-white rounded-full hover:bg-black/70"
              onClick={handleRemoveImage}
              disabled={isPending || isUploading}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending || isUploading || !!selectedFile}
            title="画像を追加"
          >
            <ImagePlus className="h-5 w-5 text-primary" />
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isPending || isUploading}
          />

          <div className="flex-grow" />

          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending || isUploading}>
              キャンセル
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitDisabled}>
            {(isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(isPending || isUploading) ? "処理中..." : "投稿する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
