// lib/data/userQueries.ts

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma } from "@prisma/client";
import type { UserSnippet, RankingSnippetForProfile, UserProfileData } from "@/lib/types"; // 共通型をインポート

export const userSnippetSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} satisfies Prisma.UserSelect;

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
        image: true,
        name: true,
        bio: true,
        coverImageUrl: true, 
        socialLinks: true
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
export const profileRankingListSelect = {
  id: true,
  sentiment: true,
  subject: true,
  listImageUrl: true,
  status: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, itemName: true, rank: true, imageUrl: true }, // imageUrl を含める
    orderBy: { rank: 'asc' },
    take: 3,
  },
  // ★ likes と likeCount を追加 ★
  likes: { // ログインユーザーがいいねしたか判定用
    select: { userId: true }
  },
  likeCount: true, // いいね数
  _count: { // _count では items のみカウント (likes は likeCount で取得)
    select: { items: true }
  }
} satisfies Prisma.RankingListSelect;

// プロフィールページで取得するユーザーデータ全体のペイロード(データの中身)定義
export const userProfilePayload = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true, clerkId: true, username: true, image: true, name: true, bio: true, coverImageUrl: true, socialLinks: true, createdAt: true,
    rankingLists: {
      where: { status: ListStatus.PUBLISHED },
      select: profileRankingListSelect,
      orderBy: [ { displayOrder: 'asc' }, { updatedAt: 'desc' } ],
    },
    _count: { select: { following: true, followedBy: true } }
  }
});

//指定されたユーザー名の公開プロフィールデータを取得
export async function getUserProfileData(username: string): Promise<UserProfileData | null> {
  console.log(`[UserQueries] Fetching profile data for username: ${username}`);
  if (!username) return null;

  try {
    const userWithLists = await prisma.user.findUnique({
      where: { username: username },
      ...userProfilePayload, // select を適用 (include は使っていないのでこのままでOK)
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

// ユーザー名からユーザーの基本情報を取得(follow/unfollow 機能)
export async function getUserByUsername(username: string): Promise<UserSnippet | null>  {
  console.log(`[UserQueries] Fetching user by username: ${username}`);
  if (!username) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, name: true, image: true},
    });
    return user;
  } catch (error) {
    console.error(`[UserQueries] Error fetching user by username ${username}:`, error);
    return null;
  }
}