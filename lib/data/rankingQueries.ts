// lib/data/rankingQueries.ts
import prisma from "@/lib/client";
import { ListStatus, Prisma } from "@prisma/client"; // Prisma と ListStatus
import { auth } from "@clerk/nextjs/server";
import type { PaginatedResponse, RankingListSnippet, RankingListEditableData } from "@/lib/types"; // RankingListSnippet も types から
import { rankingListSnippetSelect,rankingListEditSelect,rankingListViewSelect } from "../prisma/payloads"; // User スニペット
import type { RankingListViewData } from "@/lib/types"

// --- データ取得関数 ---

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

// 詳細表示用データ取得関数
export async function getRankingDetailsForView(listId: string): Promise<RankingListViewData | null> {
  const { userId: loggedInClerkId } = await auth();
  let loggedInUserDbId: string | null = null;
  if (loggedInClerkId) { try { /* ... DB ID取得 ... */ } catch (e) { /* ... */ } }
  try {
    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId,
        OR: [
          { status: ListStatus.PUBLISHED },
          { AND: [{ status: ListStatus.DRAFT }, { authorId: loggedInUserDbId ?? undefined }] },
        ],
      },
      select: rankingListViewSelect, // ★ 修正した select を使用 ★
    });
    return rankingList;
  } catch (error) { console.error("[View] Error:", error); return null; }
}

// 特定ユーザーの下書きランキングリストを取得する
export async function getDraftRankingLists(userDbId: string): Promise<RankingListSnippet[]> { // ★ 戻り値型変更 ★
  if (!userDbId) return [];
  try {
    const draftLists = await prisma.rankingList.findMany({
      where: { authorId: userDbId, status: ListStatus.DRAFT },
      select: rankingListSnippetSelect, // ★ snippet select を使用 ★
      orderBy: { updatedAt: "desc" },
    });
    return draftLists;
  } catch (error) { console.error("[Drafts] Error:", error); return []; }
}

// 特定ユーザーのランキングリストをページネーションで取得する
export async function getProfileRankingsPaginated({ userId, status, limit, cursor }: { userId: string; status: ListStatus; limit: number; cursor?: string; }): Promise<PaginatedResponse<RankingListSnippet>> {
  // ... (実装は変更なし - select: rankingListSnippetSelect を使用) ...
  const take = limit + 1;
  const skip = cursor ? 1 : 0;
  const cursorOptions = cursor ? { id: cursor } : undefined;
  const orderByOptions: Prisma.RankingListOrderByWithRelationInput[] = [{ displayOrder: "asc" /*, nulls: 'last' */ }, { updatedAt: "desc" }];

  try {
    const rankingLists = await prisma.rankingList.findMany({
      where: { authorId: userId, status: status, },
      select: rankingListSnippetSelect, // ★ snippet select を使用 ★
      orderBy: orderByOptions,
      take: take, skip: skip, cursor: cursorOptions,
    });
    let nextCursor: string | null = null;
    if (rankingLists.length > limit) { const nextItem = rankingLists.pop(); if (nextItem) { nextCursor = nextItem.id; } }
    return { items: rankingLists, nextCursor: nextCursor }; // ★ return 修正 ★
  } catch (error) { console.error("[Paginated] Error:", error); return { items: [], nextCursor: null }; }
}