import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import type { UserProfileData, UserSnippet } from "@/lib/types";
import { userProfilePayload, userSnippetSelect } from "@/lib/prisma/payloads";

// Clerk ID から内部 DB ID を取得
export async function getUserDbIdByClerkId(
  clerkId: string
): Promise<string | null> {
  const u = await safeQuery(() =>
    prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
  );
  return u?.id ?? null;
}

// 現在ログイン中ユーザーのスニペットデータ取得
export async function getCurrentLoginUserData(
  clerkUserId: string
): Promise<{
  id: string;
  clerkId: string;
  username: string;
  image: string | null;
  name: string | null;
  bio: string | null;
  coverImageUrl: string | null;
  socialLinks: Record<string, string> | null;
} | null> {
  if (!clerkUserId) return null;
  const raw = await safeQuery(() =>
    prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        username: true,
        image: true,
        name: true,
        bio: true,
        coverImageUrl: true,
        socialLinks: true,
      },
    })
  );
  if (!raw) return null;
  return {
    id: raw.id,
    clerkId: raw.clerkId,
    username: raw.username,
    image: raw.image,
    name: raw.name,
    bio: raw.bio,
    coverImageUrl: raw.coverImageUrl,
    socialLinks: (raw.socialLinks as unknown as Record<string, string>) ?? null,
  };
}

// プロフィールページ用のデータ取得
export async function getUserProfileData(
  username: string
): Promise<UserProfileData | null> {
  if (!username) {
    return null;
  }
  const raw = (await safeQuery(() =>
    prisma.user.findUnique({
      where: { username },
      ...(userProfilePayload as any),
    })
  )) as any;
  if (!raw) {
    return null;
  }
  return {
    id: raw.id,
    clerkId: raw.clerkId,
    username: raw.username,
    image: raw.image,
    name: raw.name,
    bio: raw.bio,
    coverImageUrl: raw.coverImageUrl,
    location: raw.location,
    birthday: raw.birthday,
    socialLinks: (raw.socialLinks as Record<string, string>) ?? null,
    rankingLists: raw.rankingLists,
    _count: {
      following: raw._count.following,
      followedBy: raw._count.followedBy,
    },
  };
}

// フォロー／アンフォロー用のユーザースニペット取得
export async function getUserByUsername(
  username: string
): Promise<UserSnippet | null> {
  if (!username) return null;
  const u = await safeQuery(() =>
    prisma.user.findUnique({
      where: { username },
      select: userSnippetSelect,
    })
  );
  return u ?? null;
}

// Clerk ID → username だけ欲しいときの小ヘルパー
export async function getUsernameFromDb(
  clerkId: string
): Promise<string | null> {
  const u = await safeQuery(() =>
    prisma.user.findUnique({
      where: { clerkId },
      select: { username: true },
    })
  );
  return u?.username ?? null;
}
