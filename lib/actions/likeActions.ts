"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  PaginatedResponse,
  RankingListSnippet,
  FeedItemWithRelations,
} from "@/lib/types";
import { feedItemPayload, rankingListSnippetSelect } from "@/lib/prisma/payloads";


/** --- ヘルパー関数群 --- **/

// 認証済みユーザーの DB ID を取得し、失敗時は例外を投げる
async function requireUser(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("ログインしてください。");
  const dbId = await getUserDbIdByClerkId(clerkId);
  if (!dbId) throw new Error("ユーザー情報が見つかりません。");
  return dbId;
}

// 渡されたパスをまとめてキャッシュ再検証
function bouncePaths(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

// Post/RankingList の「いいね ↔ 解除」をひとまとめにしたトグル関数
// 成功時は true=「いいね済み」、false=「未いいね」
async function toggleLike(
  target: "post" | "rankingList",
  id: string,
  userDbId: string
): Promise<boolean> {
  return safeQuery(() =>
    prisma.$transaction(async (tx) => {
      // 1) 既存 Like レコードをチェック
      let existing = null;
      if (target === "post") {
        existing = await tx.like.findFirst({ where: { userId: userDbId, postId: id } });
      } else {
        existing = await tx.like.findFirst({ where: { userId: userDbId, rankingListId: id } });
      }

      // 2) いいね解除の処理
      if (existing) {
        if (target === "post") {
          await tx.like.deleteMany({ where: { userId: userDbId, postId: id } });
          await tx.post.updateMany({
            where: { id, likeCount: { gt: 0 } },
            data: { likeCount: { decrement: 1 } },
          });
        } else {
          await tx.like.deleteMany({ where: { userId: userDbId, rankingListId: id } });
          await tx.rankingList.updateMany({
            where: { id, likeCount: { gt: 0 } },
            data: { likeCount: { decrement: 1 } },
          });
        }
        return false;
      }

      // 3) いいねの処理
      if (target === "post") {
        await tx.like.create({ data: { userId: userDbId, postId: id } });
        await tx.post.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
        });
      } else {
        await tx.like.create({ data: { userId: userDbId, rankingListId: id } });
        await tx.rankingList.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
        });
      }
      return true;
    })
  );
}


/** --- アクション関数 --- **/

// 投稿への「いいね／いいね解除」
export async function likePostAction(postId: string): Promise<ActionResult> {
  try {
    const userDbId = await requireUser();
    if (!postId) throw new Error("投稿IDが指定されていません。");
    await toggleLike("post", postId, userDbId);
    bouncePaths("/", `/status/${postId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ランキングリストへの「いいね／いいね解除」
export async function likeRankingListAction(
  rankingListId: string
): Promise<ActionResult> {
  try {
    const userDbId = await requireUser();
    if (!rankingListId) throw new Error("リストIDが指定されていません。");
    await toggleLike("rankingList", rankingListId, userDbId);
    bouncePaths("/", `/rankings/${rankingListId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** --- ページネーション付き取得 --- **/

// いいねしたランキングリストを取得
const LIKED_RANKINGS_LIMIT = 20;
export type LikedRankingResultItem = {
  likeId: string;
  list: RankingListSnippet;
};
export async function getLikedRankingsAction(
  targetUserId: string,
  cursor?: string | null
): Promise<PaginatedResponse<LikedRankingResultItem>> {
  if (!targetUserId) return { items: [], nextCursor: null };
  const take = LIKED_RANKINGS_LIMIT + 1;
  const skip = cursor ? 1 : 0;
  const cur = cursor ? { id: cursor } : undefined;

  const likes = await safeQuery(() =>
    prisma.like.findMany({
      where: { userId: targetUserId, rankingListId: { not: null } },
      select: { id: true, createdAt: true, rankingList: { select: rankingListSnippetSelect } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      cursor: cur,
    })
  );
  let nextCursor: string | null = null;
  if (likes.length > LIKED_RANKINGS_LIMIT) nextCursor = likes.pop()!.id;
  const items = likes
    .filter((l) => l.rankingList)
    .map((l) => ({ likeId: l.id, list: l.rankingList! }));
  return { items, nextCursor };
}

// いいねしたフィードアイテムを取得
const LIKED_FEED_LIMIT = 20;
export type LikedFeedResultItem = {
  likeId: string;
  feedItem: FeedItemWithRelations;
};
export async function getLikedFeedItemsAction(
  targetUserId: string,
  cursor?: string | null
): Promise<PaginatedResponse<LikedFeedResultItem>> {
  if (!targetUserId) return { items: [], nextCursor: null };
  const take = LIKED_FEED_LIMIT + 1;
  const skip = cursor ? 1 : 0;
  const cur = cursor ? { id: cursor } : undefined;

  // 1. Like レコード取得
  const likes = await safeQuery(() =>
    prisma.like.findMany({
      where: { userId: targetUserId },
      select: { id: true, postId: true, rankingListId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      cursor: cur,
    })
  );
  let nextCursor: string | null = null;
  if (likes.length > LIKED_FEED_LIMIT) nextCursor = likes.pop()!.id;

  // 2. 対応する FeedItem をまとめて取得
  const postIds = likes.map((l) => l.postId).filter((id): id is string => !!id);
  const listIds = likes.map((l) => l.rankingListId).filter((id): id is string => !!id);
  const feedItems = await safeQuery(() =>
    prisma.feedItem.findMany({
      where: { OR: [{ postId: { in: postIds } }, { rankingListId: { in: listIds } }] },
      select: feedItemPayload.select,
    })
  );

  // 3. ID→FeedItem マップを作成
  const map = new Map<string, FeedItemWithRelations>();
  for (const fi of feedItems) {
    if (fi.post) map.set(fi.post.id, fi);
    else if (fi.rankingList) map.set(fi.rankingList.id, fi);
  }

  // 4. Like 順に並べ替えて返却
  const items = likes
    .map((l) => {
      const key = l.postId ?? l.rankingListId;
      return key && map.has(key) ? { likeId: l.id, feedItem: map.get(key)! } : null;
    })
    .filter((x): x is LikedFeedResultItem => x !== null);

  return { items, nextCursor };
}
