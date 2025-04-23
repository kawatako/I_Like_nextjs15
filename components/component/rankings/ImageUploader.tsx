// components/component/rankings/ImageUploader.tsx
"use client";

import { useRef, useState, type ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, XIcon, Loader2 } from "@/components/component/Icons";
import Image from "next/image";
import { useToast } from "@/components/hooks/use-toast";

interface ImageUploaderProps {
  label: string; // 例: "ヘッダー画像", "アイテム画像"
  initialImageUrl?: string | null; // 編集時に既存の画像URLを渡す
  onFileChange: (file: File | null) => void; // ファイル選択/削除を通知
  disabled?: boolean; // フォーム送信中などに無効化
  previewClassName?: string; // プレビュー画像のクラス名 (Tailwind)
  buttonClassName?: string; // 選択ボタンのクラス名
  buttonSize?: "sm" | "lg" | "icon" | "default" | null | undefined; // ボタンサイズ
}

export default function ImageUploader({
  label,
  initialImageUrl,
  onFileChange,
  disabled = false,
  previewClassName = "w-32 h-16", // デフォルトサイズ (ヘッダー画像想定)
  buttonClassName = "",
  buttonSize = "sm",
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // initialImageUrl が外部から変更された場合に previewUrl を更新
  useEffect(() => {
    setPreviewUrl(initialImageUrl ?? null);
  }, [initialImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 既存のプレビューがあれば破棄
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "ファイルエラー", description: "画像ファイルを選択してください。", variant: "destructive" });
        onFileChange(null); // 親には null を通知
        setPreviewUrl(initialImageUrl ?? null); // プレビューを初期状態に戻す
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setPreviewUrl(URL.createObjectURL(file));
      onFileChange(file); // 親に File オブジェクトを通知
    } else {
      setPreviewUrl(initialImageUrl ?? null); // ファイル選択キャンセル時は初期画像に戻す
      onFileChange(null);
    }
     // 同じファイルを選択できるように input の値をリセット
     if (event.target) event.target.value = "";
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl); // メモリ解放
    }
    setPreviewUrl(null);
    onFileChange(null); // 親に null を通知
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  };

  return (
      <div className="mt-1 flex items-center gap-4">
        {previewUrl ? (
          <div className={`relative ${previewClassName} rounded border bg-muted overflow-hidden`}> {/* overflow-hidden 追加 */}
            <Image src={previewUrl} alt={`${label} preview`} fill className="object-cover rounded" />
            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full z-10" onClick={handleRemoveImage} disabled={disabled} title="画像を削除">
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size={buttonSize} className={buttonClassName} onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            <ImagePlus className="h-4 w-4 mr-2"/> 画像を選択
          </Button>
        )}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={disabled} />
        {/* アップロード中のローディング表示は親が行う */}
      </div>
  );
}