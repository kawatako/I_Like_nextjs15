// lib/actions/feedActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getHomeFeed } from "@/lib/data/feedQueries";
import { feedItemPayload } from "@/lib/prisma/payloads";
import type {
  FeedItemWithRelations,
  PaginatedResponse,
  ActionResult,
  FeedType 
} from "@/lib/types";
import { revalidatePath } from "next/cache";

// 一度に読み込む件数
const TIMELINE_PAGE_LIMIT = 20;

// SWR の key 型
export type FeedKey =
  | ["homeFeed", string | null, string | null]
  | ["profileFeed", string, string | null];

/**
 * フィードを取得するアクション
 */
export async function getPaginatedFeedAction(
  key: FeedKey
): Promise<PaginatedResponse<FeedItemWithRelations>> {
  const [feedType, userIdOrNull, cursor] = key;
  const take = TIMELINE_PAGE_LIMIT + 1;
  const skip = cursor ? 1 : 0;
  const cursorOptions = cursor ? { id: cursor } : undefined;

  // 認証チェック（homeFeed のみ必須）
  const { userId: clerkId } = await auth();
  const userDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;

  if (feedType === "homeFeed" && !userDbId) {
    console.warn("[getPaginatedFeed] home feed requires login");
    return { items: [], nextCursor: null };
  }

  let items: FeedItemWithRelations[] = [];
  try {
    if (feedType === "homeFeed") {
      const res = await getHomeFeed({
        userId: userDbId!,
        limit: TIMELINE_PAGE_LIMIT,
        cursor: cursor ?? undefined,
      });
      items = res.items;
    } else {
      // profileFeed
      items = (await prisma.feedItem.findMany({
        where: { userId: userIdOrNull },
        select: feedItemPayload.select,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        cursor: cursorOptions,
      })) as FeedItemWithRelations[];
    }

    let nextCursor: string | null = null;
    if (items.length > TIMELINE_PAGE_LIMIT) {
      const last = items.pop();
      nextCursor = last?.id ?? null;
    }
    return { items, nextCursor };
  } catch (err: unknown) {
    console.error("[getPaginatedFeed]", err);
    return { items: [], nextCursor: null };
  }
}

/**
 * リツイートを作成
 */
export async function retweetAction(
  feedItemId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  try {
    const original = await prisma.feedItem.findUnique({
      where: { id: feedItemId },
      select: { userId: true, user: { select: { isPrivate: true } } },
    });
    if (!original) throw new Error("投稿が見つかりません。");
    if (original.user?.isPrivate)
      throw new Error("非公開アカウントの投稿はリツイートできません。");

    const result = await prisma.$transaction(async (tx: any) => {
      const exists = await tx.retweet.findUnique({
        where: { userId_feedItemId: { userId: userDbId, feedItemId } },
        select: { id: true },
      });
      if (exists) return { already: true };

      await tx.retweet.create({ data: { userId: userDbId, feedItemId } });
      const newItem = await tx.feedItem.create({
        data: {
          userId: userDbId,
          type: "RETWEET" as FeedType,
          retweetOfFeedItemId: feedItemId,
        },
        select: { id: true },
      });
      return { already: false, newId: newItem.id };
    });

    if (!result.already) revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("[retweetAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "エラーが発生しました。",
    };
  }
}

/**
 * リツイートを取り消し
 */
export async function undoRetweetAction(
  feedItemId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.retweet.deleteMany({
        where: { userId: userDbId, feedItemId },
      });
      await tx.feedItem.deleteMany({
        where: {
          userId: userDbId,
          type: "RETWEET" as FeedType,
          retweetOfFeedItemId: feedItemId,
        },
      });
    });
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("[undoRetweetAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "エラーが発生しました。",
    };
  }
}

/**
 * 引用リツイートを作成
 */
export async function quoteRetweetAction(
  quotedFeedItemId: string,
  data: { commentContent: string; imageUrl?: string | null }
): Promise<ActionResult & { newPost?: any; newFeedItem?: any }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  const text = data.commentContent.trim();
  if (!text && !data.imageUrl)
    return { success: false, error: "コメントまたは画像を指定してください。" };
  if (text.length > 280)
    return { success: false, error: "コメントは280文字以内です。" };

  try {
    const { newPost, newFeedItem } = await prisma.$transaction(async (tx: any) => {
      const post = await tx.post.create({
        data: { authorId: userDbId, content: text, imageUrl: data.imageUrl },
      });
      const fi = await tx.feedItem.create({
        data: {
          userId: userDbId,
          type: "QUOTE_RETWEET" as FeedType,
          postId: post.id,
          quotedFeedItemId,
        },
      });
      await tx.feedItem.update({
        where: { id: quotedFeedItemId },
        data: { quoteRetweetCount: { increment: 1 } },
      });
      return { newPost: post, newFeedItem: fi };
    });
    revalidatePath("/");
    return { success: true, newPost, newFeedItem };
  } catch (err: unknown) {
    console.error("[quoteRetweetAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "エラーが発生しました。",
    };
  }
}

/**
 * 引用リツイートを削除
 */
export async function deleteQuoteRetweetAction(
  feedItemId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  try {
    const rec = await prisma.feedItem.findUnique({
      where: { id: feedItemId },
      select: { postId: true, quotedFeedItemId: true },
    });
    if (!rec || !rec.postId) throw new Error("削除対象が不正です。");

    await prisma.$transaction(async (tx: any) => {
      if (rec.quotedFeedItemId) {
        await tx.feedItem.updateMany({
          where: { id: rec.quotedFeedItemId, quoteRetweetCount: { gt: 0 } },
          data: { quoteRetweetCount: { decrement: 1 } },
        });
      }
      await tx.post.delete({ where: { id: rec.postId } });
      await tx.feedItem.delete({ where: { id: feedItemId } });
    });
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteQuoteRetweetAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "エラーが発生しました。",
    };
  }
}
