// lib/data/rankingQueries.ts
import prisma from "@/lib/client";
import { auth } from "@clerk/nextjs/server";
import type {
  PaginatedResponse,
  RankingListSnippet,
  RankingListEditableData,
  ListStatus,
} from "@/lib/types";
import {
  rankingListSnippetSelect,
  rankingListEditSelect,
  rankingListViewSelect,
} from "../prisma/payloads";

// --- 詳細表示用データ取得 ---
export async function getRankingDetailsForView(listId: string) {
  return prisma.rankingList.findFirst({
    where: {
      id: listId,
      status: "PUBLISHED",  // ← ListStatus 型（"PUBLISHED"）を直接文字列で指定
    },
    select: rankingListViewSelect,
  });
}

// --- 下書き一覧取得 ---
export async function getDraftRankingLists(
  userDbId: string
): Promise<RankingListSnippet[]> {
  if (!userDbId) return [];
  return prisma.rankingList.findMany({
    where: {
      authorId: userDbId,
      status: "DRAFT",      // ← ListStatus 型（"DRAFT"）を直接文字列で指定
    },
    select: rankingListSnippetSelect,
    orderBy: { updatedAt: "desc" },
  });
}

// 編集用データ取得関数
export async function getRankingListForEdit(listId: string): Promise<RankingListEditableData | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) { return null; }
  try {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (!user) { return null; }
    const rankingList = await prisma.rankingList.findUnique({
      where: { id: listId, authorId: user.id },
      select: rankingListEditSelect, // ★ 修正した select を使用 ★
    });
    return rankingList;
  } catch (error) { console.error("[Edit] Error:", error); return null; }
}

// --- プロフィールごとのページネーション取得 ---
export async function getProfileRankingsPaginated({
  userId,
  status,
  limit,
  cursor,
}: {
  userId: string;
  status: ListStatus;     // lib/types.ts からインポートした ListStatus 型
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<RankingListSnippet>> {
  const take = limit + 1;
  const skip = cursor ? 1 : 0;
  const cursorOption = cursor ? { id: cursor } : undefined;

  const lists = await prisma.rankingList.findMany({
    where: { authorId: userId, status },
    select: rankingListSnippetSelect,
    orderBy: [
      { displayOrder: "asc" },
      { updatedAt: "desc" },
    ],
    take,
    skip,
    cursor: cursorOption,
  });

  let nextCursor: string | null = null;
  if (lists.length > limit) {
    const next = lists.pop();
    nextCursor = next?.id ?? null;
  }
  return { items: lists, nextCursor };
}
