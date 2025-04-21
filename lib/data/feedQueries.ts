// lib/data/feedQueries.ts
import prisma from "@/lib/client";
import { Prisma, FeedItem, User, Post, RankingList, RankedItem, ListStatus, FeedType, Sentiment } from "@prisma/client"; // ★ Prisma と Enum をインポート ★
import { postPayload } from "./postQueries"; // Post 用ペイロード (likes, _count 含む想定)
import { userSnippetSelect} from "./userQueries"; // User スニペット
import { rankingListSnippetSelect } from "./rankingQueries";
import type { UserSnippet, FeedItemWithRelations, PaginatedResponse,RankingListSnippet } from "@/lib/types";

// ★ ネストされた FeedItem 用 Select (RankingList の select を修正) ★
const nestedFeedItemSelect = Prisma.validator<Prisma.FeedItemSelect>()({
  id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true, rankingListId: true, quoteRetweetCount: true,
  user: { select: userSnippetSelect },
  post: { select: postPayload.select },
  rankingList: { select: rankingListSnippetSelect },
  _count: { select: { retweets: true } },
});

// 「FeedItem を取得する際に、上記のような関連データも一緒に（どのフィールドを含めて）取得するか」を指定する設計図
export const feedItemPayload = Prisma.validator<Prisma.FeedItemDefaultArgs>()({
  select: {
    // --- FeedItem 自身のフィールド ---
    id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true,
    rankingListId: true, retweetOfFeedItemId: true, quotedFeedItemId: true,
    quoteRetweetCount: true,

    // --- 関連データ ---
    user: { select: userSnippetSelect },
    post: { select: postPayload.select },
    rankingList: { select: rankingListSnippetSelect }, // ★ 上で定義した Select を使用 ★

    _count: { select: { retweets: true } },

    // --- ネストされた FeedItem ---
    retweetOfFeedItem: { select: nestedFeedItemSelect },
    quotedFeedItem: { select: nestedFeedItemSelect }
  }
});

// --- 型定義 ---
// ★ lib/types.ts で定義・エクスポートするのを推奨 ★
// export type UserSnippet = Prisma.UserGetPayload<{ select: typeof userSnippetSelect; }>;
// export type FeedItemWithRelations = Prisma.FeedItemGetPayload<typeof feedItemPayload>;
// export type PaginatedResponse<T> = { items: T[]; nextCursor: string | null };

// --- 関数本体 ---
/**
 * 指定されたユーザーのホームタイムラインフィード(「いつ」「誰が」「何をしたか（投稿、ランキング更新、RTなど)を取得する 
 */
export async function getHomeFeed({
  userId,
  limit,
  cursor,
}: {
  userId: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<FeedItemWithRelations>> {
  if (!userId) {
    console.warn("[getHomeFeed] userId is required.");
    return { items: [], nextCursor: null };
  }
  const take = limit + 1;

  try {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const targetUserIds = followingIds;

    const feedItems = await prisma.feedItem.findMany({
      where: {
        userId: { in: targetUserIds },
        // NOT: { userId: userId, type: FeedType.RETWEET } // 自分のRT非表示
      },
      select: feedItemPayload.select, // ★ select を使用 ★
      orderBy: { createdAt: "desc" },
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | null = null;
    if (feedItems.length > limit) {
      const nextItem = feedItems.pop();
      nextCursor = nextItem!.id;
    }
    return { items: feedItems, nextCursor };

  } catch (error) {
    console.error("[getHomeFeed] Error fetching home feed:", error);
    return { items: [], nextCursor: null };
  }
}

/**
 * 指定された FeedItem ID に基づいて、関連データを含む詳細情報を取得する
 * @param feedItemId 詳細を取得したい FeedItem の ID
 * @returns FeedItemWithRelations 型のオブジェクト、または null (見つからない場合)
 */
export async function getFeedItemDetails(feedItemId: string): Promise<FeedItemWithRelations | null> {
  console.log(`[FeedQueries] Fetching details for FeedItem: ${feedItemId}`);
  if (!feedItemId) {
    console.warn("[getFeedItemDetails] feedItemId is required.");
    return null;
  }

  try {
    const feedItem = await prisma.feedItem.findUnique({
      where: { id: feedItemId },
      // ★ feedItemPayload で定義した select/include をそのまま使う ★
      //    これにより、表示に必要な関連データ (user, post, rankingList, counts, likes etc.) が含まれる
      select: feedItemPayload.select, // select を使う場合
      // include: feedItemPayload.include, // include を使う場合
    });

    if (!feedItem) {
      console.log(`[FeedQueries] FeedItem not found: ${feedItemId}`);
      return null;
    }

    console.log(`[FeedQueries] Successfully fetched details for FeedItem: ${feedItemId}`);
    return feedItem as FeedItemWithRelations; // 必要であれば型アサーション

  } catch (error) {
    console.error(`[FeedQueries] Error fetching details for FeedItem ${feedItemId}:`, error);
    return null;
  }
}