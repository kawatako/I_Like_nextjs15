// lib/data/userQueries.ts
"use server";

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma, Sentiment } from "@prisma/client";

//Clerk ID を基に、データベース内の対応するユーザーの内部ID (User.id) を取得
export async function getUserDbIdByClerkId(clerkId: string | null | undefined): Promise<string | null> {
  if (!clerkId) {
    return null;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch (error) {
    console.error(`[UserQueries] Error fetching user DB ID for clerkId ${clerkId}:`, error);
    return null;
  }
}

//現在ログインしているユーザーの詳細データを Clerk ID を基に取得
export async function getCurrentLoginUserData(clerkUserId: string) {
  console.log(`[UserQueries] Searching for user with clerkId: ${clerkUserId}`);
  if(!clerkUserId) return null; // Clerk ID がなければ null を返す

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { // UI で共通して必要になる可能性のあるフィールドを選択
        id: true,
        clerkId: true,
        username: true,
        image: true, // あなたのスキーマに合わせて 'image' に
        name: true,
        // bio や他のフィールドはここでは取得せず、必要なページで別途取得する方が効率的な場合も
      },
    });
    console.log(`[UserQueries] Found user data for header/sidebar:`, user ? "User found" : "User not found");
    return user;
  } catch (error) {
    console.error(`[UserQueries] Error fetching current user data for clerkId ${clerkUserId}:`, error);
    return null;
  }
}

// プロフィールページで表示するランキングリストに必要なフィールド定義
const profileRankingListSelect = {
  id: true,
  sentiment: true,
  subject: true,
  listImageUrl: true,
  status: true,
  _count: { select: { items: true } },
  createdAt: true,
  items: { // リスト表示用に一部アイテムを取得（例: 上位3件）
    select: { id: true, itemName: true, rank: true },
    orderBy: { rank: 'asc' },
    take: 3,
  }
} satisfies Prisma.RankingListSelect;

// 上記 select に基づく型定義 (export して RankingListForProfile の代わりに使用可能)
export type RankingSnippetForProfile = Prisma.RankingListGetPayload<{ select: typeof profileRankingListSelect }>;

// プロフィールページで取得するユーザーデータ全体のペイロード(データの中身)定義
const userProfilePayload = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    clerkId: true,
    username: true,
    image: true,
    name: true,
    bio: true,
    coverImageUrl: true,
    socialLinks: true,
    createdAt: true,
    rankingLists: {
      where: { status: ListStatus.PUBLISHED },
      select: profileRankingListSelect,
      orderBy: { createdAt: 'desc' },
    }
  }
});
// 上記ペイロードに基づく型定義 (export してページコンポーネントで使用)
export type UserProfileData = Prisma.UserGetPayload<typeof userProfilePayload>;


//指定されたユーザー名の公開プロフィールデータを取得
export async function getUserProfileData(username: string): Promise<UserProfileData | null> {
  console.log(`[UserQueries] Fetching profile data for username: ${username}`);
  if (!username) return null;

  try {
    const userWithLists = await prisma.user.findUnique({
      where: { username: username },
      ...userProfilePayload, // select と include を適用
    });

    if (!userWithLists) {
      console.log(`[UserQueries] User profile not found for username: ${username}`);
      return null;
    }

    console.log(`[UserQueries] Successfully fetched profile for ${username}`);
    return userWithLists;

  } catch (error) {
    console.error(`[UserQueries] Error fetching profile data for username ${username}:`, error);
    return null;
  }
}