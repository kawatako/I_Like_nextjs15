// lib/data/feedQueries.ts
import prisma from "@/lib/client";
import type { PaginatedResponse, FeedItemWithRelations } from "@/lib/types";
import { feedItemPayload } from "../prisma/payloads";

/**
 * Prisma から返ってくる FeedItem ペイロードを、
 * FeedItemWithRelations の型に合わせて再帰的にマッピングする
 */
function mapFeedItem(fi: any): FeedItemWithRelations {
  return {
    // id, type, createdAt, updatedAt, userId, postId, etc...
    ...fi,
    post: fi.post ?? undefined,
    rankingList: fi.rankingList ?? undefined,
    // 再帰的にマッピング
    retweetOfFeedItem: fi.retweetOfFeedItem
      ? mapFeedItem(fi.retweetOfFeedItem)
      : undefined,
    quotedFeedItem: fi.quotedFeedItem
      ? mapFeedItem(fi.quotedFeedItem)
      : undefined,
  };
}

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

    const rawItems = await prisma.feedItem.findMany({
      where: { userId: { in: followingIds } },
      select: feedItemPayload.select,
      orderBy: { createdAt: "desc" },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | null = null;
    if (rawItems.length > limit) {
      const nxt = rawItems.pop();
      nextCursor = nxt?.id ?? null;
    }

    const items = rawItems.map(mapFeedItem);

    return { items, nextCursor };
  } catch (error) {
    console.error("[getHomeFeed] Error fetching home feed:", error);
    return { items: [], nextCursor: null };
  }
}

export async function getFeedItemDetails(
  feedItemId: string
): Promise<FeedItemWithRelations | null> {
  if (!feedItemId) {
    console.warn("[getFeedItemDetails] feedItemId is required.");
    return null;
  }

  try {
    const fi = await prisma.feedItem.findUnique({
      where: { id: feedItemId },
      select: feedItemPayload.select,
    });
    if (!fi) {
      return null;
    }
    return mapFeedItem(fi);
  } catch (error) {
    console.error("[getFeedItemDetails] Error fetching details:", error);
    return null;
  }
}
