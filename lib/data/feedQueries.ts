import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import type { PaginatedResponse, FeedItemWithRelations } from "@/lib/types";
import { feedItemPayload } from "@/lib/prisma/payloads";

// Supabase 管理クライアント（プライベートバケットの署名付きURL生成用）
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 公開URLまたはblob: URLを受け取り、必要ならSupabaseの署名付きURLに変換して返す
 */
export async function signUrl(publicUrl?: string | null): Promise<string | undefined> {
  if (!publicUrl || publicUrl.startsWith("blob:")) return publicUrl ?? undefined;
  try {
    const url = new URL(publicUrl);
    const prefix = "/storage/v1/object/public/i-like/";
    if (!url.pathname.startsWith(prefix)) return publicUrl;
    const key = url.pathname.slice(prefix.length);
    const { data, error } = await supabaseAdmin.storage
      .from("i-like")
      .createSignedUrl(key, 60 * 60 * 24);
    if (error) {
      console.error("Signed URL生成失敗:", error);
      return publicUrl;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("signUrl error:", e);
    return publicUrl;
  }
}

/**
 * フィードアイテムの生データを再帰的にFeedItemWithRelations型にマッピングし、画像URLは署名付きURLに変換して返す
 */
export async function mapAndSignFeedItem(fi: any): Promise<FeedItemWithRelations> {
  // ユーザーアバター
  const userImage = await signUrl(fi.user?.image);
  // 投稿画像
  const post = fi.post
    ? { ...fi.post, imageUrl: await signUrl(fi.post.imageUrl) }
    : undefined;
  // ランキング更新アイテム画像
  const rankingList = fi.rankingList
    ? {
        ...fi.rankingList,
        items: await Promise.all(
          fi.rankingList.items.map(async (item: any) => ({
            ...item,
            imageUrl: await signUrl(item.imageUrl),
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
 * ホームフィードを取得し、画像URLを署名付きURLに変換して返す
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
    // フォロー中ユーザーIDを取得
    const following = await safeQuery(() =>
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
    );
    const followingIds = following.map((f) => f.followingId);

    // 生データ取得
    const rawItems = await safeQuery(() =>
      prisma.feedItem.findMany({
        where: { userId: { in: followingIds } },
        select: feedItemPayload.select,
        orderBy: { createdAt: "desc" },
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      })
    );

    // 次カーソル計算
    let nextCursor: string | null = null;
    if (rawItems.length > limit) {
      const nxt = rawItems.pop();
      nextCursor = nxt?.id ?? null;
    }

    // FeedItemWithRelations にマッピング＆署名付きURL生成
    const items = await Promise.all(rawItems.map(mapAndSignFeedItem));

    return { items, nextCursor };
  } catch (error) {
    console.error("[getHomeFeed] Error fetching home feed:", error);
    return { items: [], nextCursor: null };
  }
}

/**
 * 単一のフィードアイテム詳細を取得し、画像URLを署名付きURLに変換して返す
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

    // マッピング＆署名付きURL生成
    return await mapAndSignFeedItem(fi);
  } catch (error) {
    console.error("[getFeedItemDetails] Error fetching details:", error);
    return null;
  }
}
