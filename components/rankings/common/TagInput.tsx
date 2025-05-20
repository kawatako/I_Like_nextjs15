// components/rankings/common/TagInput.tsx
// // タグ入力欄を提供するコンポーネント
"use client";

import React, { useState, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { XIcon } from "@/components/Icons";
import { useToast } from "@/lib/hooks/use-toast";

interface TagInputProps {
  id?: string; // タグ入力欄の識別子 (任意)
  value: string[]; // 現在のタグ配列 (親コンポーネントで管理)
  onChange: (tags: string[]) => void; // タグ配列が変更されたときに親に通知する関数
  placeholder?: string; // 入力欄のプレースホルダー
  maxTags?: number; // 設定可能なタグの最大数 (例: 5)
  maxLength?: number; // 1つのタグの最大文字数 (例: 30)
  disabled?: boolean; // 無効化フラグ
  className?: string; // 外側の div に適用するクラス名
}

export default function TagInput({
  id,
  value = [], // デフォルトは空配列
  onChange,
  placeholder = "タグを入力 (Enter, カンマ, スペースで追加)",
  maxTags = 5,
  maxLength = 30,
  disabled = false,
  className,
}: TagInputProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(""); // 現在入力中のテキスト

  // タグを追加する処理
  const addTag = useCallback(
    (tagToAdd: string) => {
      const newTag = tagToAdd.trim();

      // バリデーション
      if (!newTag) return; // 空文字は無視
      if (newTag.length > maxLength) {
        toast({
          title: "文字数超過",
          description: `タグは${maxLength}文字以内で入力してください。`,
          variant: "destructive",
        });
        return;
      }
      if (value.length >= maxTags) {
        toast({
          title: "上限到達",
          description: `タグは${maxTags}個まで設定できます。`,
          variant: "destructive",
        });
        return;
      }
      if (value.includes(newTag)) {
        toast({
          title: "重複エラー",
          description: `タグ "${newTag}" は既に追加されています。`,
          variant: "destructive",
        });
        setInputValue(""); // 重複時は入力欄をクリア
        return;
      }

      // 親コンポーネントに新しいタグ配列を通知
      onChange([...value, newTag]);
      // 入力欄をクリア
      setInputValue("");
    },
    [value, onChange, maxTags, maxLength, toast]
  );

  // タグを削除する処理
  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    },
    [value, onChange]
  );

  // Input 要素でのキー入力処理
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    // Enter, カンマ, スペースキーでタグを追加
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault(); // デフォルトの動作（改行など）を抑制
      addTag(inputValue);
    }
    // Backspace キーで入力欄が空のとき、最後のタグを削除 (任意)
    if (event.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* タグ入力欄 */}
      <Input
        id={id}
        type='text'
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || value.length >= maxTags} // 上限に達したら無効化
        maxLength={maxLength + 5} // 少し余裕を持たせる
      />
      {/* 追加されたタグのリスト */}
      {value.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {value.map((tag) => (
            <Badge
              key={tag}
              variant='secondary'
              className='flex items-center gap-1'
            >
              <span>{tag}</span>
              <button
                type='button'
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className='ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                aria-label={`タグ ${tag} を削除`}
              >
                <XIcon className='h-3 w-3 text-muted-foreground hover:text-foreground' />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className='text-xs text-muted-foreground text-right'>
        {value.length} / {maxTags} 個
      </p>
    </div>
  );
}
