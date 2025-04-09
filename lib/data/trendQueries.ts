// lib/data/trendQueries.ts
"use server";

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma, Sentiment } from "@prisma/client";
import { auth } from '@clerk/nextjs/server';
// 必要であれば userQueries から関数をインポート
import { getUserDbIdByClerkId } from './userQueries';

// --- このファイルで使う型定義 ---

export type NewestRankingItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
};

export type MyRankingListItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
  status: ListStatus;
  aggregationCount: number;
};

export type PopularThemeItem = {
  sentiment: Sentiment;
  subject: string;
  count: number;
};

export type WeeklyThemeItem = PopularThemeItem;

export type AveragedRankItem = {
  itemName: string;
  itemDescription: string | null;
  imageUrl: string | null;
  averageRank: number | null; // AVG が NULL になる可能性も考慮
  count: number;
};

export type SearchedRankingItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
  createdAt: Date; // ソート用に含める
};


// --- 関数実装 ---

/**
 * [TRENDS-NEW] 最新公開ランキング取得
 */
export async function getNewestPublishedRankings(limit: number = 30): Promise<NewestRankingItem[]> {
  // ... (実装は Response #66, #68 と同じ) ...
  console.log(`[TrendsQueries/New] Fetching newest ${limit} published rankings...`);
  try {
    const rankings = await prisma.rankingList.findMany({
      where: { status: ListStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: { id: true, subject: true, sentiment: true },
      take: limit,
    });
    console.log(`[TrendsQueries/New] Found ${rankings.length} rankings.`);
    return rankings;
  } catch (error) {
    console.error("[TrendsQueries/New] Error fetching newest rankings:", error);
    return [];
  }
}

/**
 * [TRENDS-FORYOU] ログインユーザーのランキングとテーマ別公開数を取得
 */
export async function getRankingsByCurrentUser(): Promise<MyRankingListItem[]> {
  // ... (実装は Response #69, #70 で修正したものと同じ) ...
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) { return []; }
  const userDbId = await getUserDbIdByClerkId(loggedInClerkId); // ★ 共通関数を利用 ★
  if (!userDbId) { return []; }

  console.log(`[TrendsQueries/ForYou] Fetching rankings for user DB ID: ${userDbId}`);
  try {
    const myRankings = await prisma.rankingList.findMany({ /* ... where, orderBy, select ... */
        where: { authorId: userDbId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, subject: true, sentiment: true, status: true },
    });
    if (myRankings.length === 0) { return []; }
    const subjects = [...new Set(myRankings.map(r => r.subject))];
    const themeCounts = await prisma.rankingList.groupBy({ /* ... by, where, _count ... */
        by: ['sentiment', 'subject'],
        where: { subject: { in: subjects }, status: ListStatus.PUBLISHED },
        _count: { id: true },
    });
    const countMap = new Map<string, number>();
    themeCounts.forEach(item => { countMap.set(`${item.sentiment}-${item.subject}`, item._count.id); });
    const results: MyRankingListItem[] = myRankings.map(ranking => ({
        ...ranking,
        aggregationCount: countMap.get(`${ranking.sentiment}-${ranking.subject}`) ?? 0,
    }));
    console.log(`[TrendsQueries/ForYou] Found ${results.length} rankings with counts.`);
    return results;
  } catch (error) { console.error(`[TrendsQueries/ForYou] Error fetching rankings for user ${userDbId}:`, error); return []; }
}


/**
 * [TRENDS-TOTAL] 人気テーマ取得
 */
export async function getPopularThemes(limit: number = 20): Promise<PopularThemeItem[]> {
  // ... (実装は Response #70 と同じ) ...
  console.log(`[TrendsQueries/Total] Fetching top ${limit} popular themes...`);
  try {
    const themes = await prisma.rankingList.groupBy({ /* ... by, where, _count, orderBy, take ... */
      by: ['sentiment', 'subject'],
      where: { status: ListStatus.PUBLISHED },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });
    console.log(`[TrendsQueries/Total] Found ${themes.length} popular themes.`);
    return themes.map(theme => ({
      sentiment: theme.sentiment,
      subject: theme.subject,
      count: theme._count.id,
    }));
  } catch (error) { console.error("[TrendsQueries/Total] Error fetching popular themes:", error); return []; }
}

/**
 * [TRENDS-TOTAL_TRENDS] 週間トレンドテーマ取得
 */
export async function getWeeklyTrendingThemes(limit: number = 20): Promise<WeeklyThemeItem[]> {
  // ... (実装は Response #70 と同じ、日付ロジックは要調整) ...
  console.log(`[TrendsQueries/TotalTrends] Fetching top ${limit} weekly trending themes...`);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // ★ 要日付調整: 日曜0時起点など厳密に

  try {
    const themes = await prisma.rankingList.groupBy({ /* ... by, where (updatedAt), _count, orderBy, take ... */
      by: ['sentiment', 'subject'],
      where: { status: ListStatus.PUBLISHED, updatedAt: { gte: oneWeekAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });
     console.log(`[TrendsQueries/TotalTrends] Found ${themes.length} weekly themes.`);
    return themes.map(theme => ({ sentiment: theme.sentiment, subject: theme.subject, count: theme._count.id }));
  } catch (error) { console.error("[TrendsQueries/TotalTrends] Error fetching weekly trending themes:", error); return []; }
}

/**
 * [TRENDS-TOTAL-DETAIL / TRENDS-FORYOU-DETAIL] 平均順位計算
 * 注意: パフォーマンスに影響する可能性がある複雑なクエリ
 */
export async function calculateAverageRankForTheme(sentiment: Sentiment, subject: string): Promise<AveragedRankItem[]> {
  // ... (実装は Response #70 と同じだが、itemDescription, imageUrl の取得は要検討) ...
   console.log(`[TrendsQueries/AvgRank] Calculating average ranks for [${sentiment}] ${subject}...`);
   try {
    const listsForTheme = await prisma.rankingList.findMany({ where: { sentiment, subject, status: ListStatus.PUBLISHED }, select: { id: true } });
    if (listsForTheme.length === 0) return [];
    const listIds = listsForTheme.map(l => l.id);

    const aggregatedItems = await prisma.rankedItem.groupBy({
        by: ['itemName'], // ★ アイテム名でグループ化
        where: { listId: { in: listIds } },
        _avg: { rank: true },
        _count: { id: true }, // アイテムが登場するリスト数をカウント
        orderBy: { _avg: { rank: 'asc' } }, // 平均ランク昇順
    });

    // TODO: アイテムの説明や画像を効率的に取得する方法を検討
    // (例: aggregatedItems の itemName を元に別途 item マスタ等を検索する)
    console.log(`[TrendsQueries/AvgRank] Calculated ranks for ${aggregatedItems.length} items for [${sentiment}] ${subject}.`);
    return aggregatedItems.map(item => ({
        itemName: item.itemName,
        itemDescription: null, // Placeholder
        imageUrl: null,        // Placeholder
        averageRank: item._avg.rank, // null の可能性も考慮 (型定義で | null)
        count: item._count.id,
    }));
   } catch (error) { console.error(`[TrendsQueries/AvgRank] Error calculating avg ranks for [${sentiment}] ${subject}:`, error); return []; }
}


/**
 * [TRENDS-SEARCH] ランキング検索 (タイトル or アイテム名)
 */
export async function searchRankings(query: string, limit: number = 20): Promise<SearchedRankingItem[]> {
  // ... (実装は Response #70 と同じ) ...
  console.log(`[TrendsQueries/Search] Searching for query: ${query}`);
  if (!query || query.trim() === '') return [];
  const searchTerm = query.trim();

  try {
    // タイトル検索とアイテム名検索を分けて実行し、結果をマージ・重複排除
    const listsBySubject = await prisma.rankingList.findMany({
        where: { subject: { contains: searchTerm, mode: 'insensitive' }, status: ListStatus.PUBLISHED },
        select: { id: true, subject: true, sentiment: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: limit,
    });
    const listsByItem = await prisma.rankingList.findMany({
        where: { status: ListStatus.PUBLISHED, items: { some: { itemName: { contains: searchTerm, mode: 'insensitive' } } } },
        select: { id: true, subject: true, sentiment: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: limit,
    });

    const combined = [...listsBySubject, ...listsByItem];
    const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());
    uniqueResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`[TrendsQueries/Search] Found ${uniqueResults.length} unique results for query: ${query}`);
    return uniqueResults.slice(0, limit).map(r => ({ // 最終結果に limit を適用
        id: r.id,
        subject: r.subject,
        sentiment: r.sentiment,
        createdAt: r.createdAt,
    }));
  } catch (error) { console.error(`[TrendsQueries/Search] Error searching rankings for query "${query}":`, error); return []; }
}