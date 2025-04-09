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

// トレンドアクションの型を定義
export type MyRankingListItem = {
  id: string;
  subject: string;
  sentiment: Sentiment;
  status: ListStatus;
  aggregationCount: number;
};

// 自分が作成したランキングリストを取得します (タイトルとIDのみ)。param limit 取得する最大件数 (デフォルト: 30)returns ランキングリストの配列 (id, subject)
export async function getRankingsByCurrentUser(): Promise<MyRankingListItem[]> {
  const { userId: loggedInClerkId } = await auth();

  if (!loggedInClerkId) {
    console.log("[TrendsAction/ForYou] User not logged in.");
    return [];
  }

  let userDbId: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: loggedInClerkId },
      select: { id: true },
    });
    if (user) {
      userDbId = user.id;
    } else {
      console.warn(`[TrendsAction/ForYou] User with clerkId ${loggedInClerkId} not found in DB.`);
      return [];
    }
  } catch (error) {
    console.error(`[TrendsAction/ForYou] Error fetching user DB ID for clerkId ${loggedInClerkId}:`, error);
    return [];
  }

  console.log(`[TrendsAction/ForYou] Fetching rankings for user DB ID: ${userDbId}`);
  try {
    // 1. まず自分のリストを取得 (必要なフィールドのみ)
    const myRankings = await prisma.rankingList.findMany({
      where: {
        authorId: userDbId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        subject: true,
        sentiment: true,
        status: true,
      },
    });

    if (myRankings.length === 0) {
      return []; // 自分のリストがなければここで終了
    }

    // 2. 自分のリストのタイトル (subject) をユニークに抽出
    const subjects = [...new Set(myRankings.map(r => r.subject))];

    // 3. それらのタイトルを持つ「公開済み」リストの数をDBから一括で取得
    const subjectCounts = await prisma.rankingList.groupBy({
      by: ['subject'],
      where: {
        subject: { in: subjects },
        status: ListStatus.PUBLISHED,
      },
      _count: {
        subject: true, // subject ごとの件数をカウント
      },
    });

    // 4. 結果を Map<subject, count> に変換して検索しやすくする
    const countMap = new Map(subjectCounts.map(item => [item.subject, item._count.subject]));

    // 5. 自分のリストデータに集計数を付加して最終的な配列を作成
    const results: MyRankingListItem[] = myRankings.map(ranking => ({
      ...ranking,
      // Map から件数を取得 (自分のリストも含まれる場合があるので -1 するか要件次第だが、ここでは総数をそのまま表示)
      aggregationCount: countMap.get(ranking.subject) ?? 0,
    }));

    console.log(`[TrendsAction/ForYou] Found ${results.length} rankings with counts.`);
    return results;

  } catch (error) {
    console.error(`[TrendsAction/ForYou] Error fetching rankings for user ${userDbId}:`, error);
    return [];
  }
}