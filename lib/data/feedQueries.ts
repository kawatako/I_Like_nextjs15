// lib/data/feedQueries.ts
import prisma from "@/lib/client";
import { Prisma, FeedItem, User, Post, RankingList, RankedItem, ListStatus, FeedType, Sentiment } from "@prisma/client"; // ★ Prisma と Enum をインポート ★
import { postPayload } from "./postQueries"; // Post 用ペイロード (likes, _count 含む想定)
import { userSnippetSelect } from "./userQueries"; // User スニペット
import type { UserSnippet, FeedItemWithRelations, PaginatedResponse } from "@/lib/types";

// --- Select オブジェクト定義 ---

// ★ カード表示等に必要な RankingList のフィールドを定義 ★
const rankingListSelectForCard = Prisma.validator<Prisma.RankingListSelect>()({
  id: true,
  sentiment: true,
  subject: true,
  description: true, // ★ description を追加 ★
  status: true,
  listImageUrl: true, // 必要なら
  createdAt: true, // 公開/更新判定用
  updatedAt: true, // 更新日時表示用
  items: {         // ★ items の imageUrl を含める ★
    orderBy: { rank: 'asc' },
    take: 3, // プレビュー用に件数を絞る（必要なら全件取得やページネーションを検討）
    select: { id: true, rank: true, itemName: true, imageUrl: true }, // ★ imageUrl: true ★
  },
  // ★ いいね情報を追加 ★
  likes: { select: { userId: true } },
  _count: { select: { items: true, likes: true } } // ★ likes カウント追加 ★
  // author は FeedItem.user と重複するため不要
});

// ★ ネストされた FeedItem 用 Select (RankingList の select を修正) ★
const nestedFeedItemSelect = Prisma.validator<Prisma.FeedItemSelect>()({
  id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true, rankingListId: true, quoteRetweetCount: true,
  user: { select: userSnippetSelect },
  post: { select: postPayload.select },
  rankingList: { select: rankingListSelectForCard }, // ★ 上で定義した Select を使用 ★
  _count: { select: { retweets: true } },
});

// ★★★ メインの feedItemPayload ★★★
export const feedItemPayload = Prisma.validator<Prisma.FeedItemDefaultArgs>()({
  select: {
    // --- FeedItem 自身のフィールド ---
    id: true, type: true, createdAt: true, updatedAt: true, userId: true, postId: true,
    rankingListId: true, retweetOfFeedItemId: true, quotedFeedItemId: true,
    quoteRetweetCount: true,

    // --- 関連データ ---
    user: { select: userSnippetSelect },
    post: { select: postPayload.select },
    rankingList: { select: rankingListSelectForCard }, // ★ 上で定義した Select を使用 ★

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
 * 指定されたユーザーのホームタイムラインフィードを取得する (カーソルベースページネーション)
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
    const targetUserIds = [...followingIds, userId];

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

