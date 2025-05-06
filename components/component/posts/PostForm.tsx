// components/component/posts/PostForm.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction } from "@/lib/actions/postActions";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/hooks/use-toast";
import { Loader2, ImagePlus, XIcon } from "@/components/component/Icons"; // Loader2 アイコンをインポート
import { useImageUploader} from "@/components/hooks/useImageUploader"; // 画像アップロード用フック
import Image from "next/image";

export default function PostForm() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast(); // Toast フックを使用
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // ★ ファイル入力用 ref ★
  const [content, setContent] = useState(""); // フォームの内容を管理する State
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 選択されたファイルを管理する State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // ★ プレビュー URL 用 State ★
  const [isPending, startTransition] = useTransition();
  const {
    uploadImage,
    isLoading: isUploading,
    error: uploadError,
  } = useImageUploader();

  // ★ ファイル選択時のハンドラ ★
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 画像ファイルか簡易チェック
      if (!file.type.startsWith("image/")) {
        toast({
          title: "ファイルエラー",
          description: "画像ファイルを選択してください。",
          variant: "destructive",
        });
        return;
      }
      // TODO: ファイルサイズチェック (任意)
      setSelectedFile(file);
      // プレビューURL生成
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

  // ★ 画像削除ハンドラ ★
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // input の値をリセット
    }
  };

  // ★★★ フォーム送信ハンドラ ★★★
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // デフォルトの送信をキャンセル
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 && !selectedFile) {
      toast({
        title: "投稿エラー",
        description: "内容を入力するか画像を選択してください。",
        variant: "destructive",
      });
      return; // 内容も画像もなければ何もしない
    }
    if (trimmedContent.length > 280) {
      toast({
        title: "投稿エラー",
        description: "投稿内容は280文字以内で入力してください。",
        variant: "destructive",
      });
      return;
    }

    let imageUrl: string | null | undefined = undefined; // 送信する画像 URL

    startTransition(async () => {
      // ★ useTransition でラップ ★
      try {
        // 1. 画像が選択されていればアップロード
        if (selectedFile) {
          imageUrl = await uploadImage(selectedFile); // ★ アップロード関数呼び出し ★
          if (!imageUrl) {
            // アップロード失敗時のエラーは useImageUploader 内の toast で表示されるはず
            // 必要ならここで追加のハンドリング
            return; // アップロード失敗ならここで中断
          }
        }

        // 2. Server Action を呼び出し
        const result = await createPostAction({
          content: trimmedContent,
          imageUrl: imageUrl, // アップロードした URL または null/undefined
        });

        // 3. 結果に応じてフィードバック
        if (result.success) {
          setContent(""); // テキストエリアをクリア
          setSelectedFile(null); // ファイル選択をクリア
          setPreviewUrl(null); // プレビューをクリア
          if (fileInputRef.current) fileInputRef.current.value = ""; // input リセット
          toast({ title: result.message || "投稿しました！" });
        } else {
          toast({
            title: "投稿エラー",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        // uploadImage や createPostAction の予期せぬエラー
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
      <div className='p-4'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  if (!user)
    return (
      <div className='p-4 text-center text-muted-foreground'>
        投稿するにはログインしてください。
      </div>
    );

  const isSubmitDisabled =
    isPending || isUploading || (content.trim().length === 0 && !selectedFile); // 送信中、アップロード中、両方空、は無効

  return (
    <div className='flex space-x-4 p-4 border-b'>
      <form ref={formRef} onSubmit={handleSubmit} className='flex-1 space-y-2'>
        <Textarea
          name='content'
          placeholder='投稿してみよう'
          rows={3}
          maxLength={280}
          className='w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent'
          disabled={isPending || isUploading} // ★ アップロード中も無効化 ★
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* ★ 画像プレビューと削除ボタン ★ */}
        {previewUrl && (
          <div className='relative w-fit'>
            {" "}
            {/* w-fit で画像の幅に合わせる */}
            <Image
              src={previewUrl}
              alt='Preview'
              width={100}
              height={100}
              className='rounded-md object-cover max-h-40 w-auto'
            />{" "}
            {/* サイズ調整 */}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute top-1 right-1 h-6 w-6 bg-black/50 text-white rounded-full hover:bg-black/70'
              onClick={handleRemoveImage}
              disabled={isPending || isUploading}
            >
              <XIcon className='h-4 w-4' />
              <span className='sr-only'>画像を削除</span>
            </Button>
          </div>
        )}

        <div className='flex justify-between items-center'>
          {" "}
          {/* 左寄せと右寄せ */}
          {/* ★ ファイル選択ボタン ★ */}
          <Button
            type='button' // フォーム送信をしない
            variant='ghost'
            size='icon'
            onClick={() => fileInputRef.current?.click()} // input をクリック
            disabled={isPending || isUploading || !!selectedFile} // 送信中、アップロード中、ファイル選択済みなら無効
            title='画像を追加'
          >
            <ImagePlus className='h-5 w-5 text-primary' />
            <span className='sr-only'>画像を選択</span>
          </Button>
          {/* 隠しファイル入力 */}
          <input
            type='file'
            accept='image/*' // 画像ファイルのみ許可
            ref={fileInputRef}
            onChange={handleFileChange}
            className='hidden'
            disabled={isPending || isUploading}
          />
          {/* ★ 送信ボタン ★ */}
          <Button type='submit' disabled={isSubmitDisabled} size='sm'>
            {isPending || isUploading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {isPending || isUploading ? "処理中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}
