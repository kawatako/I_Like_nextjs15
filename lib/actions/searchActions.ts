// lib/actions/searchActions.ts
"use server";

import prisma from "@/lib/client";
import { TrendPeriod } from "@prisma/client";
import { rankingListSnippetSelect } from "@/lib/prisma/payloads";
import type { PaginatedResponse, RankingListSnippet } from "@/lib/types";

const DEFAULT_LIMIT = 10;

/**
 * 検索結果を取得する Server Action
 * @param query 検索キーワード
 * @param tab "title" | "item" | "tag"
 * @param sort "count" | "new" | "like"
 * @param cursor 次ページ取得用カーソル（前回取得の最後のID）
 * @param limit 1ページあたりの件数（デフォルト: 10）
 * @returns PaginatedResponse<RankingListSnippet>
 */
export async function searchRankingListsAction(
  query: string,
  tab: "title" | "item" | "tag",
  sort: "count" | "new" | "like",
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PaginatedResponse<RankingListSnippet>> {
  // 1件余分に取得して nextCursor を判定
  const take = limit + 1;
  const skip = cursor ? 1 : 0;
  const cursorOption = cursor ? { id: cursor } : undefined;

  // WHERE句：公開済みのみ
  const whereClause: any = { status: "PUBLISHED" };
  if (tab === "title") {
    whereClause.subject = { contains: query, mode: "insensitive" };
  } else if (tab === "item") {
    whereClause.items = {
      some: { itemName: { contains: query, mode: "insensitive" } },
    };
  } else {
    whereClause.tags = {
      some: { name: { equals: query, mode: "insensitive" } },
    };
  }

  // 件数順: TrendingSubject（月次集計）を参照して JS 側でソート
  if (sort === "count") {
    const trends = await prisma.trendingSubject.findMany({
      where: { period: TrendPeriod.MONTHLY },
      select: { subject: true, count: true },
    });
    const countMap = Object.fromEntries(trends.map((t) => [t.subject, t.count]));

    const allLists = await prisma.rankingList.findMany({
      where: whereClause,
      select: rankingListSnippetSelect,
      cursor: cursorOption,
      skip,
      take,
    });

    const sorted = allLists
      .map((l) => ({ ...l, _monthlyCount: countMap[l.subject] ?? 0 }))
      .sort((a, b) => b._monthlyCount - a._monthlyCount)
      .slice(0, limit + 1);

    const items = sorted.slice(0, limit) as RankingListSnippet[];
    const nextCursor = sorted.length > limit ? sorted[limit].id : null;
    return { items, nextCursor };
  }

  // 新着順 or いいね順
  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : { likeCount: "desc" as const };

  const results = await prisma.rankingList.findMany({
    where: whereClause,
    select: rankingListSnippetSelect,
    orderBy,
    cursor: cursorOption,
    skip,
    take,
  });

  let nextCursor: string | null = null;
  if (results.length > limit) {
    nextCursor = results[limit].id;
    results.pop();
  }
  return { items: results, nextCursor };
}
