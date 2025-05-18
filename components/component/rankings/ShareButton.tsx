// components/component/rankings/ShareButton.tsx
"use client";

import { Share2 } from "lucide-react";

interface ShareButtonProps {
  subject: string;
  tags: { tag: { name: string } }[];
  url: string;
}

export function ShareButton({ subject, tags, url }: ShareButtonProps) {
  // タグ配列を "#タグ名" 形式で連結
  const tagString = tags.map((t) => `#${t.tag.name}`).join(" ");
  // ツイート用テキスト（URLはintentのurlパラメータで渡すのでここには含めません）
  const shareText = `『${subject}』のランキングを作成しました。\nみんなも投票しよう\n#TopMe ${tagString}`;
  // Web Intent URL
  const shareUrl = [
    `https://twitter.com/intent/tweet`,
    `text=${encodeURIComponent(shareText)}`,
    `url=${encodeURIComponent(url)}`
  ].join("&");

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
