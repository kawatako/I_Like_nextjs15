// components/component/profiles/ProfileHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/component/follows/FollowButton";
import type { FollowStatusInfo } from "@/lib/types";
import type { UserProfileData as UserProfileDataType } from "@/lib/types";
import { MapPinIcon, CakeIcon } from "../Icons"
import { SocialLinks } from "./SocialLinks";


interface ProfileHeaderProps {
  userProfileData: UserProfileDataType;
  isCurrentUser: boolean;
  initialFollowStatus: FollowStatusInfo | null;
}

export function ProfileHeader({
  userProfileData,
  isCurrentUser,
  initialFollowStatus,
}: ProfileHeaderProps) {
  const {
    id,
    username,
    name,
    bio,
    image,
    coverImageUrl,
    location,
    birthday,
    socialLinks,
    _count: { following, followedBy },
  } = userProfileData;

  // 誕生日表示
  const formattedBirthday = birthday
    ? new Date(birthday).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // socialLinks 安全に取り出し
  const social: Record<string, string> = {};
  if (socialLinks) {
    for (const key of ["x", "instagram", "tiktok", "website"] as const) {
      const v = socialLinks[key];
      if (typeof v === "string") social[key] = v;
    }
  }

  return (
    <section className="mb-8 border-b pb-8">
      {/* カバー */}
      <div className="relative h-40 sm:h-48 md:h-60 bg-muted overflow-hidden">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`${username} のカバー画像`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700" />
        )}
      </div>

      <div className="px-4 sm:px-6 relative">
        {/* アバター */}
        <div className="relative -mt-12 sm:-mt-16 z-10 w-fit">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background text-4xl">
            <AvatarImage
              src={image ?? undefined}
              alt={`${username} のプロフィール画像`}
            />
            <AvatarFallback>
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* 編集／フォロー */}
        <div className="absolute top-4 right-4 sm:right-6 z-10">
          {isCurrentUser ? (
            <Link href={`/profile/${username}/edit`} passHref>
              <Button variant="outline" size="sm">
                プロフィールを編集
              </Button>
            </Link>
          ) : initialFollowStatus ? (
            <FollowButton
              targetUserId={id}
              targetUsername={username}
              initialFollowStatusInfo={initialFollowStatus}
            />
          ) : (
            <Button variant="secondary" size="sm" disabled>
              ...
            </Button>
          )}
        </div>

        {/* ユーザー情報 */}
        <div className="mt-4 space-y-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold break-all">
              {name || username}
            </h1>
            <p className="text-muted-foreground">@{username}</p>
          </div>
          {bio && (
            <p className="text-sm max-w-prose whitespace-pre-wrap">{bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {location && (
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-4 w-4" /> {location}
              </div>
            )}
            {formattedBirthday && (
              <div className="flex items-center gap-1">
                <CakeIcon className="h-4 w-4" /> {formattedBirthday}
              </div>
            )}
<SocialLinks
  links={{
    website: social.website,
    x:        social.x,
    instagram:social.instagram,
    tiktok:   social.tiktok,
  }}
  className="mt-2"
/>
          </div>

          <div className="flex gap-4 text-sm pt-1">
            <Link href={`/follows/${username}?tab=following`} className="hover:underline">
              <span className="font-semibold">{following}</span>{" "}
              <span className="text-muted-foreground">フォロー中</span>
            </Link>
            <Link href={`/follows/${username}?tab=followers`} className="hover:underline">
              <span className="font-semibold">{followedBy}</span>{" "}
              <span className="text-muted-foreground">フォロワー</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
);
}
