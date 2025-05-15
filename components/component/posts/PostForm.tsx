//co
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction } from "@/lib/actions/postActions";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/hooks/use-toast";
import { Loader2, ImagePlus, XIcon } from "@/components/component/Icons";
import { useImageUploader } from "@/components/hooks/useImageUploader";
import Image from "next/image";

export default function PostForm() {
  const { user, isLoaded } = useUser();
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 && !selectedFile) {
      toast({
        title: "投稿エラー",
        description: "内容を入力するか画像を選択してください。",
        variant: "destructive",
      });
      return;
    }
    if (trimmedContent.length > 280) {
      toast({
        title: "投稿エラー",
        description: "投稿内容は280文字以内で入力してください。",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        let imageUrl: string | null = null;
        if (selectedFile) {
          const uploaded = await uploadImage(selectedFile);
          if (!uploaded) {
            return;
          }
          imageUrl = uploaded.signedUrl;
        }

        const result = await createPostAction({
          content: trimmedContent,
          imageUrl,
        });

        if (result.success) {
          setContent("");
          setSelectedFile(null);
          setPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast({ title: result.message || "投稿しました！" });
        } else {
          toast({
            title: "投稿エラー",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error submitting post:", error);
        toast({
          title: "投稿エラー",
          description: "予期せぬエラーが発生しました。",
          variant: "destructive",
        });
      }
    });
  };

  if (!isLoaded)
    return (
      <div className="p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!user)
    return (
      <div className="p-4 text-center text-muted-foreground">
        投稿するにはログインしてください。
      </div>
    );

  const isSubmitDisabled =
    isPending || isUploading || (content.trim().length === 0 && !selectedFile);

  return (
    <div className="flex space-x-4 p-4 border-b">
      <Avatar>
        <AvatarImage src={user.imageUrl} alt={user.username || undefined} />
        <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 space-y-2">
        <Textarea
          name="content"
          placeholder="投稿してみよう"
          rows={3}
          maxLength={280}
          className="w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          disabled={isPending || isUploading}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {previewUrl && (
          <div className="relative w-fit">
            <Image
              src={previewUrl}
              alt="Preview"
              width={100}
              height={100}
              className="rounded-md object-cover max-h-40 w-auto"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white rounded-full hover:bg-black/70"
              onClick={handleRemoveImage}
              disabled={isPending || isUploading}
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">画像を削除</span>
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending || isUploading || !!selectedFile}
            title="画像を追加"
          >
            <ImagePlus className="h-5 w-5 text-primary" />
            <span className="sr-only">画像を選択</span>
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={isPending || isUploading}
          />
          <Button type="submit" disabled={isSubmitDisabled} size="sm">
            {isPending || isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isPending || isUploading ? "処理中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}
