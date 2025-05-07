// lib/actions/searchActions.ts
"use server";

import prisma from "@/lib/client";
import { rankingListSnippetSelect } from "@/lib/prisma/payloads";
import type { PaginatedResponse, RankingListSnippet, TrendPeriod } from "@/lib/types";

const DEFAULT_LIMIT = 10;

/**
 * 検索結果を取得する Server Action
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

  // 公開済みのみ
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

  // 件数順
  if (sort === "count") {
    // Prisma の返す型を明示
    type Trend = { subject: string; count: number };
    const trends = await prisma.trendingSubject.findMany({
      where: { period: "MONTHLY" as TrendPeriod },
      select: { subject: true, count: true },
    }) as Trend[];

    const countMap: Record<string, number> = Object.fromEntries(
      trends.map((t: Trend): [string, number] => [t.subject, t.count])
    );

    const allLists = await prisma.rankingList.findMany({
      where: whereClause,
      select: rankingListSnippetSelect,
      cursor: cursorOption,
      skip,
      take,
    });
    // 一時的に _monthlyCount を持つ型
    type ListWithCount = RankingListSnippet & { _monthlyCount: number };

    const sorted = (allLists as RankingListSnippet[])
      .map((l: RankingListSnippet): ListWithCount => ({
        ...l,
        _monthlyCount: countMap[l.subject] ?? 0,
      }))
      .sort((a: ListWithCount, b: ListWithCount): number =>
        b._monthlyCount - a._monthlyCount
      )
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
