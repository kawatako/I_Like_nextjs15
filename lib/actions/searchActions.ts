// lib/actions/searchActions.ts
"use server";

import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { rankingListSnippetSelect } from "@/lib/prisma/payloads";
import type { PaginatedResponse, RankingListSnippet, TrendPeriod,UserSnippet } from "@/lib/types";
import { generateImageUrl } from "@/lib/utils/storage";

const DEFAULT_LIMIT = 10;

/**
 * 検索結果を取得する Server Action
 * - タイトル／アイテム名／タグでの検索
 * - ソートは「月間トレンド数」「新着順」「いいね順」に対応
 */
export async function searchRankingListsAction(
  query: string,
  tab: "title" | "item" | "tag"| "user",
  sort: "count" | "new" | "like"| "username" | "name",
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PaginatedResponse<RankingListSnippet>> {
  const take = limit + 1;
  const skip = cursor ? 1 : 0;
  const cursorOption = cursor ? { id: cursor } : undefined;

  // 公開済みのみ対象
  const whereClause: any = { status: "PUBLISHED" };
  if (tab === "title") {
    whereClause.subject = { contains: query, mode: "insensitive" as const };
  } else if (tab === "item") {
    whereClause.items = {
      some: { itemName: { contains: query, mode: "insensitive" as const} },
    };
  } else {
    whereClause.tags = {
      some: { name: { equals: query, mode: "insensitive" as const} },
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

/// --- ユーザー検索 ---
export async function searchUsersAction(
  query: string,
  sort: "username" | "name",
  cursor?: string,
  limit = 10
): Promise<PaginatedResponse<UserSnippet>> {
  const take = limit + 1;
  const skip = cursor ? 1 : 0;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { [sort]: { equals: query, mode: "insensitive" as const } },  // 完全一致
        { [sort]: { startsWith: query, mode: "insensitive" as const } }, // 前方一致
        { [sort]: { contains: query, mode: "insensitive" as const } },  // 部分一致
      ],
    },
    orderBy: [{ [sort]: "asc" }],
    cursor: cursor ? { id: cursor } : undefined,
    skip,
    take,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
    },
  });

  // 並び替え（完全→前方→部分）
  const sortedUsers = [
    ...users.filter((u) => u[sort]?.toLowerCase() === query.toLowerCase()),
    ...users.filter(
      (u) =>
        u[sort]?.toLowerCase().startsWith(query.toLowerCase()) &&
        u[sort]?.toLowerCase() !== query.toLowerCase()
    ),
    ...users.filter(
      (u) =>
        u[sort]?.toLowerCase().includes(query.toLowerCase()) &&
        !u[sort]?.toLowerCase().startsWith(query.toLowerCase())
    ),
  ];

  let nextCursor = null;
  if (sortedUsers.length > limit) {
    const next = sortedUsers.pop();
    nextCursor = next!.id;
  }

  // 画像表示のため署名付きURLを付けて返却
  const usersWithSignedUrls = await Promise.all(
    sortedUsers.map(async (user) => ({
      ...user,
      image: await generateImageUrl(user.image),
    }))
  );

  return { items: usersWithSignedUrls, nextCursor };
}
