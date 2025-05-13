// lib/actions/searchActions.ts
"use server";

import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { rankingListSnippetSelect } from "@/lib/prisma/payloads";
import type { PaginatedResponse, RankingListSnippet, TrendPeriod } from "@/lib/types";

const DEFAULT_LIMIT = 10;

/**
 * 検索結果を取得する Server Action
 * - タイトル／アイテム名／タグでの検索
 * - ソートは「月間トレンド数」「新着順」「いいね順」に対応
 */
export async function searchRankingListsAction(
  query: string,
  tab: "title" | "item" | "tag",
  sort: "count" | "new" | "like",
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PaginatedResponse<RankingListSnippet>> {
  const take = limit + 1;
  const skip = cursor ? 1 : 0;
  const cursorOption = cursor ? { id: cursor } : undefined;

  // 公開済みのみ対象
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

  // 件数順ソート（MONTHLYトレンド件数）
  if (sort === "count") {
    // まずトレンドテーブルを取得
    type Trend = { subject: string; count: number };
    const trends = await safeQuery(() =>
      prisma.trendingSubject.findMany({
        where: { period: "MONTHLY" as TrendPeriod },
        select: { subject: true, count: true },
      })
    ) as Trend[];

    const countMap: Record<string, number> = Object.fromEntries(
      trends.map((t) => [t.subject, t.count])
    );

    // 検索対象リストを取得
    const allLists = await safeQuery(() =>
      prisma.rankingList.findMany({
        where: whereClause,
        select: rankingListSnippetSelect,
        cursor: cursorOption,
        skip,
        take,
      })
    ) as RankingListSnippet[];

    // _monthlyCount を付与してソートし、ページネーション
    type ListWithCount = RankingListSnippet & { _monthlyCount: number };
    const sorted = allLists
      .map((l) => ({
        ...l,
        _monthlyCount: countMap[l.subject] ?? 0,
      }))
      .sort((a: ListWithCount, b: ListWithCount) => b._monthlyCount - a._monthlyCount)
      .slice(0, take);

    const items = sorted.slice(0, limit) as RankingListSnippet[];
    const nextCursor = sorted.length > limit ? sorted[limit].id : null;
    return { items, nextCursor };
  }

  // 新着順 or いいね順
  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : { likeCount: "desc" as const };

  // ソート適用後の取得
  const results = await safeQuery(() =>
    prisma.rankingList.findMany({
      where: whereClause,
      select: rankingListSnippetSelect,
      orderBy,
      cursor: cursorOption,
      skip,
      take,
    })
  ) as RankingListSnippet[];

  let nextCursor: string | null = null;
  if (results.length > limit) {
    nextCursor = results[limit].id;
    results.pop();
  }
  return { items: results, nextCursor };
}
