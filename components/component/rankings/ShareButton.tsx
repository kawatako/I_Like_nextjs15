// components/component/rankings/ShareButton.tsx
"use client";

import { Share2 } from "lucide-react";

interface ShareButtonProps {
  subject: string;
  tags: { tag: { name: string } }[];  // RankingListViewData の型に合わせて調整してください
}

export function ShareButton({ subject, tags }: ShareButtonProps) {
  // タグ配列を "#タグ名" 形式で連結
  const tagString = tags.map((t) => `#${t.tag.name}`).join(" ");
  // ツイート用テキスト
  const shareText = `${subject}のランキングを作成しました
あなたもランキングに参加しよう
#TopMe ${tagString}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Xでシェア"
      className="flex items-center"
    >
      <Share2 className="h-5 w-5 cursor-pointer" />
    </a>
  );
}
