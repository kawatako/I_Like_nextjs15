// components/SocialLinks.tsx
"use client";

import {
  TwitterIcon,
  InstagramIcon,
  TikTokIcon,
  LinkIcon,
} from "@/components/Icons";

export interface SocialLinksProps {
  links: Partial<
    Record<"website" | "x" | "instagram" | "tiktok", string | null>
  >;
  className?: string;
}

export function SocialLinks({ links, className }: SocialLinksProps) {
  // キーとアイコンのマップ
  const iconMap: Record<string, React.ReactNode> = {
    website: <LinkIcon className='w-5 h-5' />,
    x: <TwitterIcon className='w-5 h-5' />,
    instagram: <InstagramIcon className='w-5 h-5' />,
    tiktok: <TikTokIcon className='w-5 h-5' />,
  };

  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      {(Object.entries(links) as [keyof typeof links, string | null][])
        .filter(([, url]) => Boolean(url)) // url が null/空文字でないものだけ
        .map(([key, url]) => (
          <a
            key={key}
            href={url!}
            target='_blank'
            rel='noopener noreferrer nofollow'
            className='text-primary hover:text-primary/80'
            title={key}
          >
            {iconMap[key]}
          </a>
        ))}
    </div>
  );
}
