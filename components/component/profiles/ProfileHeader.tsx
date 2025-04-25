// components/component/profiles/ProfileHeader.tsx
"use client";

import Link from "next/link";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// ★ 必要な型をインポート ★
import type { UserProfileData } from "@/lib/types";
import type { FollowStatusInfo } from '@/lib/actions/followActions'; // ★ 詳細な型をインポート ★
import { FollowButton } from "@/components/component/follows/FollowButton"; // ★ FollowButton をインポート ★
// ★ アイコンをインポート ★
import { MapPinIcon, CakeIcon, LinkIcon, /* 他のSNSアイコン */ } from 'lucide-react';

interface ProfileHeaderProps {
  userProfileData: UserProfileData;
  isCurrentUser: boolean;
  // ★ initialFollowStatus の型を詳細な FollowStatusInfo に ★
  initialFollowStatus: FollowStatusInfo | null;
}

export function ProfileHeader({
  userProfileData,
  isCurrentUser,
  initialFollowStatus, // ★ 詳細な型で受け取る ★
}: ProfileHeaderProps) {

  if (!userProfileData || !userProfileData.username) {
    return <div className="p-4 text-center text-muted-foreground">ユーザー情報の読み込みに失敗しました。</div>;
  }
  const { username, name, bio, image, coverImageUrl, location, birthday, socialLinks, _count } = userProfileData;

  const followingCount = _count?.following ?? 0;
  const followersCount = _count?.followedBy ?? 0;
  const followingHref = `/follows/${username}?tab=following`;
  const followersHref = `/follows/${username}?tab=followers`;

  // 生年月日フォーマット
  const formattedBirthday = birthday
    ? new Date(birthday).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // SNSリンクのパース
  let socialLinksData: { x?: string | null, instagram?: string | null, tiktok?: string | null, website?: string | null } = {};
  if (typeof socialLinks === 'object' && socialLinks !== null) {
     socialLinksData = {
        x: typeof (socialLinks as any).x === 'string' ? (socialLinks as any).x : null,
        instagram: typeof (socialLinks as any).instagram === 'string' ? (socialLinks as any).instagram : null,
        tiktok: typeof (socialLinks as any).tiktok === 'string' ? (socialLinks as any).tiktok : null,
        website: typeof (socialLinks as any).website === 'string' ? (socialLinks as any).website : null,
     };
  }

  return (
    <section className='mb-8 border-b pb-8'>
      {/* カバー画像 */}
      <div className="relative h-40 sm:h-48 md:h-60 bg-muted overflow-hidden">
        {coverImageUrl ? (
          <Image src={coverImageUrl} alt={`${username} のカバー画像`} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700"></div>
        )}
      </div>

      {/* プロフィール本体 */}
      <div className="px-4 sm:px-6 relative">
        {/* アバター */}
        <div className="relative -mt-12 sm:-mt-16 z-10 w-fit">
          <Avatar className='w-24 h-24 sm:w-32 sm:h-32 border-4 border-background text-4xl'>
            <AvatarImage src={image ?? undefined} alt={`${username} のプロフィール画像`} />
            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* 編集/フォローボタン */}
        <div className="absolute top-4 right-4 sm:right-6 z-10">
           {isCurrentUser ? (
              <Link href={`/profile/${username}/edit`} passHref>
                <Button variant='outline' size='sm'>プロフィールを編集</Button>
              </Link>
            ) : initialFollowStatus ? ( // ★ initialFollowStatus が null でないことを確認 ★
              // ★★★ FollowButton に詳細な initialFollowStatusInfo を渡す ★★★
              <FollowButton
                targetUserId={userProfileData.id}
                targetUsername={username}
                initialFollowStatusInfo={initialFollowStatus} // ← そのまま渡す
              />
            ) : ( <Button variant='secondary' size='sm' disabled>...</Button> )}
        </div>

        {/* ユーザー情報 */}
        <div className="mt-4 space-y-3">
          {/* 名前とユーザー名 */}
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold break-all'>{name || username}</h1>
            <p className='text-muted-foreground'>@{username}</p>
          </div>
          {/* 自己紹介 */}
          {bio && ( <p className='text-sm max-w-prose whitespace-pre-wrap'>{bio}</p> )}
          {/* 場所・誕生日・Webサイト */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
             {location && ( <div className="flex items-center gap-1"><MapPinIcon className="h-4 w-4"/> {location}</div> )}
             {formattedBirthday && ( <div className="flex items-center gap-1"><CakeIcon className="h-4 w-4"/> {formattedBirthday}</div> )}
             {socialLinksData.website && (
                <div className="flex items-center gap-1">
                   <LinkIcon className="h-4 w-4"/>
                   <a href={socialLinksData.website} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline truncate max-w-xs">
                      {socialLinksData.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                   </a>
                </div>
             )}
             {/* TODO: 他のSNSリンク */}
          </div>
          {/* フォロー・フォロワー数 */}
          <div className='flex gap-4 text-sm pt-1'>
            <Link href={followingHref} className='hover:underline'><span className='font-semibold'>{followingCount}</span> <span className='text-muted-foreground'>フォロー中</span></Link>
            <Link href={followersHref} className='hover:underline'><span className='font-semibold'>{followersCount}</span> <span className='text-muted-foreground'>フォロワー</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}