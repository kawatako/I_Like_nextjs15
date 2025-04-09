// lib/data/rankingQueries.ts
"use server"; // サーバーサイドでの実行を示す

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma, Sentiment } from "@prisma/client";
import { auth } from '@clerk/nextjs/server'; // 権限チェックや表示制御のため auth を使う場合がある

// 編集用データペイロード定義
const rankingListEditPayload = Prisma.validator<Prisma.RankingListDefaultArgs>()({
  include: {
    items: { orderBy: { rank: "asc" } },
  },
});
// 戻り値の型
export type RankingListEditableData = Prisma.RankingListGetPayload<typeof rankingListEditPayload>;

//ランキングの編集ページ (/rankings/[listId]/edit) で使用するための元データを、安全にデータベースから取得する関数
export async function getRankingListForEdit(listId: string): Promise<RankingListEditableData | null> {
  console.log(`[RankingQueries] getRankingListForEdit called for listId: ${listId}`);
  const { userId: clerkId } = await auth(); // ここでも認証は必要
  if (!clerkId) {
    console.warn("[RankingQueries/Edit] User not authenticated.");
    return null;
  }
  try {
    const currentUser = await prisma.user.findUnique({ where: { clerkId: clerkId }, select: { id: true } });
    if (!currentUser) {
      console.warn(`[RankingQueries/Edit] User with clerkId ${clerkId} not found in DB.`);
      return null;
    }
    const userDbId = currentUser.id;
    console.log(`[RankingQueries/Edit] Authenticated user DB ID: ${userDbId}`);

    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId,
        authorId: userDbId, // 所有者チェック
      },
      include: rankingListEditPayload.include, // items を含む
    });

    if (!rankingList) {
      console.log(`[RankingQueries/Edit] List ${listId} not found or user ${userDbId} is not author.`);
      return null;
    }
    console.log(`[RankingQueries/Edit] Successfully fetched list ${listId} for user ${userDbId}`);
    return rankingList;
  } catch (error) {
    console.error(`[RankingQueries/Edit] Error fetching list ${listId}:`, error);
    return null;
  }
}


// --- ★ getRankingDetailsForView 関数 (元 rankingActions.ts から移動) ★ ---
// 閲覧用データペイロード定義 (author 情報を含む)
const rankingListViewPayload = Prisma.validator<Prisma.RankingListDefaultArgs>()({
  include: {
    items: { orderBy: { rank: 'asc' } },
    author: {
      select: { id: true, clerkId: true, username: true, image: true }
    }
  },
});
// 戻り値の型
export type RankingListViewData = Prisma.RankingListGetPayload<typeof rankingListViewPayload>;

export async function getRankingDetailsForView(listId: string): Promise<RankingListViewData | null> {
  console.log(`[RankingQueries/View] Fetching ranking details for listId: ${listId}`);
  const { userId: loggedInClerkId } = await auth(); // 閲覧者の Clerk ID
  let loggedInUserDbId: string | null = null;
  if (loggedInClerkId) { /* ... DB ID取得処理 (エラーハンドリング含む) ... */
    try { const viewer = await prisma.user.findUnique({ where: { clerkId: loggedInClerkId }, select: { id: true }}); if (viewer) loggedInUserDbId = viewer.id; else console.warn(`[View] Viewer clerkId ${loggedInClerkId} not found.`); } catch(e){ console.error('Error fetching viewer ID', e); }
  }

  try {
    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId,
        OR: [ // 表示条件: 公開済み、または (下書き かつ 自分作成)
          { status: ListStatus.PUBLISHED },
          { AND: [ { status: ListStatus.DRAFT }, { authorId: loggedInUserDbId ?? undefined } ] }
        ],
      },
      include: rankingListViewPayload.include, // items と author を含む
    });
    if (!rankingList) { console.log(`[RankingQueries/View] List ${listId} not found or permission denied.`); return null; }
    console.log(`[RankingQueries/View] Successfully fetched list ${listId}`);
    return rankingList;
  } catch (error) {
    console.error(`[RankingQueries/View] Error fetching list ${listId}:`, error);
    return null;
  }
}


// --- ★ getDraftRankingLists 関数 (元 userService.ts から移動) ★ ---
// 下書きリスト表示用 select 定義 (必要に応じて調整)
const draftRankingListSelect = {
  id: true, sentiment: true, subject: true, listImageUrl: true, status: true,
  _count: { select: { items: true } }, createdAt: true, updatedAt: true,
  items: { select: { id: true, itemName: true, rank: true }, orderBy: { rank: 'asc' }, take: 1 }
} satisfies Prisma.RankingListSelect;
// 戻り値の型
export type DraftRankingSnippet = Prisma.RankingListGetPayload<{ select: typeof draftRankingListSelect }>;

export async function getDraftRankingLists(userDbId: string): Promise<DraftRankingSnippet[]> {
  console.log(`[RankingQueries/Drafts] Fetching DRAFT lists for userDbId: ${userDbId}`);
  if (!userDbId) return [];
  try {
      const draftLists = await prisma.rankingList.findMany({
          where: { authorId: userDbId, status: ListStatus.DRAFT },
          select: draftRankingListSelect,
          orderBy: { updatedAt: 'desc' },
      });
      console.log(`[RankingQueries/Drafts] Found ${draftLists.length} draft lists for userDbId: ${userDbId}`);
      return draftLists;
  } catch (error) {
      console.error(`[RankingQueries/Drafts] Error fetching draft lists for userDbId ${userDbId}:`, error);
      return [];
  }
}

// --- 今後、ランキングに関する他の汎用的なクエリ関数をここに追加 ---