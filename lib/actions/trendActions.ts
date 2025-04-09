"use server"; // サーバーサイドで実行されることを示す
import { ListStatus, Prisma, Sentiment } from "@prisma/client";
import prisma from "../client"; // Prisma Client のインポートパスを確認・修正
import { auth } from '@clerk/nextjs/server'; 




//公開されている最新のランキングリストを取得します (タイトルとIDのみ)。param limit 取得する最大件数 (デフォルト: 30)returns ランキングリストの配列 (id, subject)
export async function getNewestPublishedRankings(limit: number = 30): Promise<{ id: string, subject: string, sentiment: Sentiment }[]> {
  console.log(`[TrendsAction/New] Fetching newest ${limit} published rankings...`);
  try {
    const rankings = await prisma.rankingList.findMany({
      where: {
        status: ListStatus.PUBLISHED, // 公開済みのもののみ
      },
      orderBy: {
        createdAt: 'desc', // 作成日時が新しい順
      },
      select: {
        id: true,       // 詳細ページへのリンク用
        subject: true,  // 表示用タイトル
        sentiment: true,
      },
      take: limit, // 取得件数を制限
    });
    console.log(`[TrendsAction/New] Found ${rankings.length} rankings.`);
    return rankings;
  } catch (error) {
    console.error("[TrendsAction/New] Error fetching newest rankings:", error);
    return []; // エラー時は空配列を返す
  }
}

// getRankingsByCurrentUserの型定義
export type MyRankingListItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
  status: ListStatus;
  aggregationCount: number; // 同じ「感情＋タイトル」の公開リスト数
};
// 自分のランキングリストを取得します (感情 + タイトルの組み合わせごとに件数を集計)。
export async function getRankingsByCurrentUser(): Promise<MyRankingListItem[]> {
  const { userId: loggedInClerkId } = await auth();

  if (!loggedInClerkId) {
    console.log("[TrendsAction/ForYou] User not logged in.");
    return [];
  }

  let userDbId: string | null = null;
  try {
    // ... (ユーザーDB ID取得部分は変更なし) ...
    const user = await prisma.user.findUnique({ where: { clerkId: loggedInClerkId }, select: { id: true } });
    if (user) { userDbId = user.id; } else { /* ... */ return []; }
  } catch (error) { /* ... */ return []; }

  console.log(`[TrendsAction/ForYou] Fetching rankings for user DB ID: ${userDbId}`);
  try {
    // 1. 自分のリストを取得 (変更なし)
    const myRankings = await prisma.rankingList.findMany({
      where: { authorId: userDbId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, subject: true, sentiment: true, status: true },
    });

    if (myRankings.length === 0) { return []; }

    // 2. 自分のリストのタイトル (subject) をユニークに抽出 (変更なし)
    const subjects = [...new Set(myRankings.map(r => r.subject))];

    // 3. ★★★ グループ化キーに sentiment を追加 ★★★
    const themeCounts = await prisma.rankingList.groupBy({
      by: ['sentiment', 'subject'], // ← ここで sentiment も指定！
      where: {
        subject: { in: subjects },
        status: ListStatus.PUBLISHED,
      },
      _count: {
        id: true, // カウント方法は id のままでOK
      },
      // 並び順はここでは不要
    });

    // 4. ★★★ Map のキーを「sentiment-subject」形式に変更 ★★★
    const countMap = new Map<string, number>();
    themeCounts.forEach(item => {
      const key = `${item.sentiment}-${item.subject}`; // キーを結合して作成
      countMap.set(key, item._count.id);
    });

    // 5. ★★★ Map から取得する際も結合キーを使用 ★★★
    const results: MyRankingListItem[] = myRankings.map(ranking => {
      const key = `${ranking.sentiment}-${ranking.subject}`; // 検索用のキーも同様に作成
      return {
        ...ranking,
        // 結合キーで Map から件数を取得
        aggregationCount: countMap.get(key) ?? 0,
      };
    });

    console.log(`[TrendsAction/ForYou] Found ${results.length} rankings with counts.`);
    return results;

  } catch (error) {
    console.error(`[TrendsAction/ForYou] Error fetching rankings for user ${userDbId}:`, error);
    return [];
  }
}