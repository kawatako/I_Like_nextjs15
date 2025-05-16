"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction } from "@/lib/actions/postActions";
import { useToast } from "@/components/hooks/use-toast";
import { Loader2, ImagePlus, XIcon } from "@/components/component/Icons";
import { useImageUploader } from "@/components/hooks/useImageUploader";
import Image from "next/image";
import type { UserSnippet } from "@/lib/types";

interface PostFormProps {
  currentLoginUserData: UserSnippet;
}

export default function PostForm({ currentLoginUserData }: PostFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { uploadImage, isLoading: isUploading } = useImageUploader();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "ファイルエラー",
          description: "画像ファイルを選択してください。",
          variant: "destructive",
        });
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent && !selectedFile) {
      toast({ title: "投稿エラー", description: "内容を入力するか画像を選択してください。", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        let imageUrl: string | null = null;
        if (selectedFile) {
          const res = await uploadImage(selectedFile);
          if (!res) return;
          imageUrl = res.signedUrl;
        }

        const result = await createPostAction({ content: trimmedContent, imageUrl });
        if (result.success) {
          setContent(""); setSelectedFile(null); setPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast({ title: result.message || "投稿しました！" });
        } else {
          toast({ title: "投稿エラー", description: result.error, variant: "destructive" });
        }
      } catch {
        toast({ title: "投稿エラー", description: "予期せぬエラーが発生しました。", variant: "destructive" });
      }
    });
  };

  const isSubmitDisabled = isPending || isUploading || (!content.trim() && !selectedFile);

  return (
    <div className="flex space-x-4 p-4 border-b">
      <Avatar className="w-12 h-12">
        <AvatarImage src={currentLoginUserData.image ?? undefined} alt={currentLoginUserData.username ?? undefined} />
        <AvatarFallback>{currentLoginUserData.username?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 space-y-2">
        <Textarea
          placeholder="投稿してみよう"
          rows={3}
          maxLength={280}
          disabled={isPending || isUploading}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {previewUrl && (
          <div className="relative w-fit">
            <Image src={previewUrl} alt="Preview" width={100} height={100} className="rounded-md object-cover max-h-40 w-auto" />
            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={handleRemoveImage} disabled={isPending || isUploading}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isPending || isUploading || !!selectedFile}>
            <ImagePlus className="h-5 w-5" />
          </Button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isPending || isUploading} />
          <Button type="submit" disabled={isSubmitDisabled} size="sm">
            {isPending || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending || isUploading ? "処理中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}
