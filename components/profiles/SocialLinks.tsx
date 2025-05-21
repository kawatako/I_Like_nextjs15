// components/SocialLinks.tsx
"use client";

import {
  TwitterIcon,
  InstagramIcon,
  TikTokIcon,
  LinkIcon,
} from "@/components/Icons";

export interface SocialLinksProps {
  links: {
    website?: string;
    x?: string;
    instagram?: string;
    tiktok?: string;
  };
}

export function SocialLinks({ links }: SocialLinksProps) {
  // 「名前・URL・アイコン・ラベル」をまとめた配列
  const items = [
    {
      name: "website",
      url: links.website,
      icon: <LinkIcon   className="w-5 h-5" />,
      label: "ウェブサイト",
    },
    {
      name: "x",
      url: links.x,
      icon: <TwitterIcon className="w-5 h-5" />,
      label: "X（旧Twitter）",
    },
    {
      name: "instagram",
      url: links.instagram,
      icon: <InstagramIcon className="w-5 h-5" />,
      label: "Instagram",
    },
    {
      name: "tiktok",
      url: links.tiktok,
      icon: <TikTokIcon  className="w-5 h-5" />,
      label: "TikTok",
    },
  ];

  return (
    <div className="flex items-center gap-4 mt-2">
      {items
        .filter(item => Boolean(item.url)) //Boolean(item.url) が true を返す要素だけを新しい配列に残す
        .map(item => (
          <a
            key={item.name}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary hover:text-primary/80"
            title={item.label}
          >
            {item.icon}
          </a>
        ))}
    </div>
  );
}
