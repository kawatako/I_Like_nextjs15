// lib/data/feedQueries.ts
"use server";

import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { generateImageUrl } from "@/lib/utils/storage";
import type { PaginatedResponse, FeedItemWithRelations } from "@/lib/types";
import { feedItemPayload } from "@/lib/prisma/payloads";

/**
 * フィードアイテムの生データを再帰的に FeedItemWithRelations 型にマッピングし、
 * 画像 URL はすべて generateImageUrl で署名付き URL に変換して返す
 */
export async function mapAndSignFeedItem(fi: any): Promise<FeedItemWithRelations> {
  // ユーザーアバター
  const userImage = await generateImageUrl(fi.user?.image);

  // 投稿（Post）の画像
  const post = fi.post
    ? {
        ...fi.post,
        imageUrl: await generateImageUrl(fi.post.imageUrl),
      }
    : undefined;

  // ランキングリスト更新アイテム（RankingList）のアイテム画像
  const rankingList = fi.rankingList
    ? {
        ...fi.rankingList,
        items: await Promise.all(
          fi.rankingList.items.map(async (item: any) => ({
            ...item,
            imageUrl: await generateImageUrl(item.imageUrl),
          }))
        ),
      }
    : undefined;

  return {
    ...fi,
    user: { ...fi.user, image: userImage },
    post,
    rankingList,
    // 再帰的にリツイート元／引用元も同様にマッピング
    retweetOfFeedItem: fi.retweetOfFeedItem
      ? await mapAndSignFeedItem(fi.retweetOfFeedItem)
      : undefined,
    quotedFeedItem: fi.quotedFeedItem
      ? await mapAndSignFeedItem(fi.quotedFeedItem)
      : undefined,
  };
}

/**
 * ホームフィードを取得し、画像 URL をすべて署名付き URL に変換して返す
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
    // 1) フォロー中ユーザー ID の取得
    const following = await safeQuery(() =>
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
    );
    const followingIds = following.map((f) => f.followingId);

    // ★ 自分自身も含める ★
    const authorIds = [userId, ...followingIds];

    // 2) フィードアイテムの生データ取得（自分 or フォロー中ユーザー の投稿を取得）
    const rawItems = await safeQuery(() =>
      prisma.feedItem.findMany({
        where: { userId: { in: authorIds } },
        select: feedItemPayload.select,
        orderBy: { createdAt: "desc" },
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      })
    );

    // 3) 次のカーソル計算
    let nextCursor: string | null = null;
    if (rawItems.length > limit) {
      const nxt = rawItems.pop();
      nextCursor = nxt?.id ?? null;
    }

    // 4) 署名付き URL 変換を含むマッピング
    const items = await Promise.all(rawItems.map(mapAndSignFeedItem));

    return { items, nextCursor };
  } catch (error) {
    console.error("[getHomeFeed] Error fetching home feed:", error);
    return { items: [], nextCursor: null };
  }
}


/**
 * 単一のフィードアイテム詳細を取得し、
 * 画像 URL をすべて署名付き URL に変換して返す
 */
export async function getFeedItemDetails(
  feedItemId: string
): Promise<FeedItemWithRelations | null> {
  if (!feedItemId) {
    console.warn("[getFeedItemDetails] feedItemId is required.");
    return null;
  }

  try {
    const fi = await safeQuery(() =>
      prisma.feedItem.findUnique({
        where: { id: feedItemId },
        select: feedItemPayload.select,
      })
    );
    if (!fi) return null;

    return await mapAndSignFeedItem(fi);
  } catch (error) {
    console.error("[getFeedItemDetails] Error fetching details:", error);
    return null;
  }
}
