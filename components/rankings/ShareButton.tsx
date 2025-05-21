//components/rankings/ShareButton.tsx
"use client";

import { XIcon } from "@/components/Icons";

interface ShareButtonProps {
  subject: string;
  tags: { tag: { name: string } }[];
  url: string;
  title?: string;
}

export function ShareButton({ subject, tags, url }: ShareButtonProps) {
  const tagString = tags.map((t) => `#${t.tag.name}`).join(" ");
  const shareText = `『${subject}』のランキングを作成しました。\nみんなも投票しよう！\n#TopMe ${tagString}`;

  const shareUrl =
    `https://twitter.com/intent/tweet` +
    `?text=${encodeURIComponent(shareText)}` +
    `&url=${encodeURIComponent(url)}`;

  return (
    <a
      href={shareUrl}
      target='_blank'
      rel='noopener noreferrer'
      title='Xでシェア'
      className='flex items-center'
    >
      <XIcon className='h-5 w-5 cursor-pointer' />
    </a>
  );
}
