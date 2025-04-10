// lib/data/trendQueries.ts
"use server";

import prisma from "@/lib/client"; // Prisma Client のインポートパスを確認・修正
import { ListStatus, Prisma, Sentiment } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from "./userQueries";

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
  averageRank: number | null; // 平均順位 (計算できなかった場合は null の可能性)
  count: number; // そのアイテムが該当テーマのリストに登場した回数
  // itemDescription: string | null; // V2: 必要なら後で追加
  // imageUrl: string | null;        // V2: 必要なら後で追加
};

export type SearchedRankingItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
  createdAt: Date; // ソート用に含める
};

//[TRENDS-NEW] 最新公開ランキング取得
export async function getNewestPublishedRankings(
  limit: number = 30
): Promise<NewestRankingItem[]> {
  console.log(
    `[TrendsQueries/New] Fetching newest ${limit} published rankings...`
  );
  try {
    const rankings = await prisma.rankingList.findMany({
      where: { status: ListStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
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

//[TRENDS-FORYOU] ログインユーザーのランキングとテーマ別公開数を取得
export async function getRankingsByCurrentUser(): Promise<MyRankingListItem[]> {
  const { userId: loggedInClerkId } = await auth();
  if (!loggedInClerkId) {
    return [];
  }
  const userDbId = await getUserDbIdByClerkId(loggedInClerkId); // ★ 共通関数を利用 ★
  if (!userDbId) {
    return [];
  }

  console.log(
    `[TrendsQueries/ForYou] Fetching rankings for user DB ID: ${userDbId}`
  );
  try {
    const myRankings = await prisma.rankingList.findMany({
      /* ... where, orderBy, select ... */ where: { authorId: userDbId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, subject: true, sentiment: true, status: true },
    });
    if (myRankings.length === 0) {
      return [];
    }
    const subjects = [...new Set(myRankings.map((r) => r.subject))];
    const themeCounts = await prisma.rankingList.groupBy({
      /* ... by, where, _count ... */ by: ["sentiment", "subject"],
      where: { subject: { in: subjects }, status: ListStatus.PUBLISHED },
      _count: { id: true },
    });
    const countMap = new Map<string, number>();
    themeCounts.forEach((item) => {
      countMap.set(`${item.sentiment}-${item.subject}`, item._count.id);
    });
    const results: MyRankingListItem[] = myRankings.map((ranking) => ({
      ...ranking,
      aggregationCount:
        countMap.get(`${ranking.sentiment}-${ranking.subject}`) ?? 0,
    }));
    console.log(
      `[TrendsQueries/ForYou] Found ${results.length} rankings with counts.`
    );
    return results;
  } catch (error) {
    console.error(
      `[TrendsQueries/ForYou] Error fetching rankings for user ${userDbId}:`,
      error
    );
    return [];
  }
}

//[TRENDS-TOTAL] 人気テーマ取得
export async function getPopularThemes(
  limit: number = 20
): Promise<PopularThemeItem[]> {
  console.log(`[TrendsQueries/Total] Fetching top ${limit} popular themes...`);
  try {
    const themes = await prisma.rankingList.groupBy({
      /* ... by, where, _count, orderBy, take ... */
      by: ["sentiment", "subject"],
      where: { status: ListStatus.PUBLISHED },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });
    console.log(`[TrendsQueries/Total] Found ${themes.length} popular themes.`);
    return themes.map((theme) => ({
      sentiment: theme.sentiment,
      subject: theme.subject,
      count: theme._count.id,
    }));
  } catch (error) {
    console.error(
      "[TrendsQueries/Total] Error fetching popular themes:",
      error
    );
    return [];
  }
}

//[TRENDS-TOTAL_TRENDS] 週間トレンドテーマ取得
export async function getWeeklyTrendingThemes(
  limit: number = 20
): Promise<WeeklyThemeItem[]> {
  console.log(
    `[TrendsQueries/TotalTrends] Fetching top ${limit} weekly trending themes...`
  );
  const now = new Date(); //サーバーの現在時刻を取得
  const currentDayOfWeek = now.getDay(); // 0 (日曜) から 6 (土曜)
  const diffToSunday = now.getDate() - currentDayOfWeek; // 日曜日に合わせるための差分
  const startDate = new Date(now.setDate(diffToSunday)); // 直近の日曜日の日付を取得
  startDate.setHours(0, 0, 0, 0); // 時刻を 00:00:00.000 に設定
  console.log(
    `[TrendsQueries/TotalTrends] Calculating trends since: ${startDate.toISOString()}`
  );

  try {
    const themes = await prisma.rankingList.groupBy({
      /* ... by, where (updatedAt), _count, orderBy, take ... */
      by: ["sentiment", "subject"],
      where: { status: ListStatus.PUBLISHED, updatedAt: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });
    console.log(
      `[TrendsQueries/TotalTrends] Found ${themes.length} weekly themes.`
    );
    return themes.map((theme) => ({
      sentiment: theme.sentiment,
      subject: theme.subject,
      count: theme._count.id,
    }));
  } catch (error) {
    console.error(
      "[TrendsQueries/TotalTrends] Error fetching weekly trending themes:",
      error
    );
    return [];
  }
}

//[TRENDS-TOTAL-DETAIL / TRENDS-FORYOU-DETAIL] 平均順位計算 注意: パフォーマンスに影響する可能性がある複雑なクエリ
export async function calculateAverageRankForTheme(
  sentiment: Sentiment,
  subject: string
): Promise<AveragedRankItem[]> {
  console.log(
    `[TrendsQueries/AvgRank] Calculating average ranks for [${sentiment}] ${subject}...`
  );
  try {
    // 1. 指定されたテーマに合致する公開済みリストの ID を全て取得
    const listsForTheme = await prisma.rankingList.findMany({
      where: {
        sentiment: sentiment,
        subject: subject,
        status: ListStatus.PUBLISHED,
      },
      select: { id: true }, // ID のみ取得
    });

    // 対象リストがなければ空配列を返す
    if (listsForTheme.length === 0) {
      console.log(
        `[TrendsQueries/AvgRank] No published lists found for [${sentiment}] ${subject}.`
      );
      return [];
    }
    const listIds = listsForTheme.map((l) => l.id);

    // 2. それらのリストに含まれる全アイテムについて、アイテム名でグループ化し、
    //    平均順位 (_avg.rank) と登場回数 (_count.id) を計算
    const aggregatedItems = await prisma.rankedItem.groupBy({
      by: ["itemName"], // アイテム名でグループ化
      where: {
        listId: { in: listIds }, // 対象リストのアイテムのみ
      },
      _avg: {
        rank: true, // rank の平均値を計算
      },
      _count: {
        id: true, // 各アイテム名の登場回数 (リスト数) をカウント
      },
      orderBy: {
        _avg: {
          rank: "asc", // 平均ランクの昇順 (低い方が上位) でソート
        },
      },
      // 必要であれば件数制限 (take: ...)
    });

    // 3. 結果を整形して返す
    //    (現時点では itemDescription や imageUrl は含まない)
    const results: AveragedRankItem[] = aggregatedItems.map((item) => ({
      itemName: item.itemName,
      averageRank: item._avg.rank, // 平均順位 (null になる場合も考慮)
      count: item._count.id, // 登場回数
      // itemDescription: null,    // V2で実装
      // imageUrl: null,           // V2で実装
    }));

    console.log(
      `[TrendsQueries/AvgRank] Calculated ranks for ${results.length} items for [${sentiment}] ${subject}.`
    );
    return results;
  } catch (error) {
    console.error(
      `[TrendsQueries/AvgRank] Error calculating average ranks for [${sentiment}] ${subject}:`,
      error
    );
    return []; // エラー時は空配列
  }
}

//[TRENDS-SEARCH] ランキング検索 (タイトル or アイテム名)
export async function searchRankings(
  query: string,
  limit: number = 20
): Promise<SearchedRankingItem[]> {
  console.log(`[TrendsQueries/Search] Searching for query: ${query}`);
  // 前後の空白を削除
  const searchTerm = query.trim();
  // 検索キーワードが空の場合は空配列を返す
  if (searchTerm === "") return [];

  try {
    // 1. タイトル(subject)にキーワードが部分一致するリストを検索
    const listsBySubject = await prisma.rankingList.findMany({
      where: {
        subject: {
          contains: searchTerm, // ★ 部分一致
          mode: "insensitive", // ★ 大文字小文字区別なし
        },
        status: ListStatus.PUBLISHED, // 公開済みのみ
      },
      select: { id: true, subject: true, sentiment: true, createdAt: true },
      orderBy: { createdAt: "desc" }, // 新しい順
      take: limit, // 上限設定
    });

    // 2. アイテム名(itemName)にキーワードが部分一致するリストを検索
    const listsByItem = await prisma.rankingList.findMany({
      where: {
        status: ListStatus.PUBLISHED, // 公開済みのみ
        items: {
          // 関連するアイテムの中に...
          some: {
            // いずれか一つでも条件に合えばOK
            itemName: {
              contains: searchTerm, // ★ 部分一致
              mode: "insensitive", // ★ 大文字小文字区別なし
            },
          },
        },
      },
      select: { id: true, subject: true, sentiment: true, createdAt: true },
      orderBy: { createdAt: "desc" }, // 新しい順
      take: limit, // 上限設定
    });

    // 3. 結果を結合し、重複を削除 (IDで判断)
    const combined = [...listsBySubject, ...listsByItem];
    const uniqueResultsMap = new Map<string, SearchedRankingItem>();
    combined.forEach((item) => {
      // findMany で select しているので、型を合わせる
      const resultItem: SearchedRankingItem = {
        id: item.id,
        subject: item.subject,
        sentiment: item.sentiment,
        createdAt: item.createdAt,
      };
      if (!uniqueResultsMap.has(item.id)) {
        uniqueResultsMap.set(item.id, resultItem);
      }
    });
    const uniqueResults = Array.from(uniqueResultsMap.values());

    // 4. 最終結果を再度 createdAt でソート (新しい順)
    uniqueResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(
      `[TrendsQueries/Search] Found ${uniqueResults.length} unique results for query: ${query}`
    );

    // 5. 上限件数 (limit) を適用して返す
    return uniqueResults.slice(0, limit);
  } catch (error) {
    console.error(
      `[TrendsQueries/Search] Error searching rankings for query "${query}":`,
      error
    );
    return []; // エラー時は空配列
  }
}
