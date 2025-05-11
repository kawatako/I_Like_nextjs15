// lib/actions/feedActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getHomeFeed, mapAndSignFeedItem } from "@/lib/data/feedQueries";
import { feedItemPayload } from "@/lib/prisma/payloads";
import type {
  FeedItemWithRelations,
  PaginatedResponse,
  ActionResult,
  FeedKey,
  FeedType,
} from "@/lib/types";
import { revalidatePath } from "next/cache";

// 一度に読み込むフィードアイテム上限＋１
const TIMELINE_PAGE_LIMIT = 20;

/**
 * 汎用フィード取得アクション
 * key の内容に応じ、ホームまたはプロフィールのタイムラインをページネーション付きで返す
 */
export async function getPaginatedFeedAction(
  key: FeedKey
): Promise<PaginatedResponse<FeedItemWithRelations>> {
  const [feedType, userIdOrNull, cursor] = key;
  const take = TIMELINE_PAGE_LIMIT + 1;
  const skip = cursor ? 1 : 0;

  // cursor が string のときだけ { id: string } をセット
  let cursorOption: { id: string } | undefined;
  if (cursor) {
    cursorOption = { id: cursor };
  }

  // 認証チェック（homeFeed のみ必須）
  const { userId: clerkId } = await auth();
  const userDbId = clerkId ? await getUserDbIdByClerkId(clerkId) : null;
  if (feedType === "homeFeed" && !userDbId) {
    console.warn("[getPaginatedFeedAction] home feed requires login");
    return { items: [], nextCursor: null };
  }

  let items: FeedItemWithRelations[] = [];
  let nextCursor: string | null = null;

  try {
    if (feedType === "homeFeed") {
      // ホームフィード：getHomeFeed から既に署名付きURL済みのデータを取得
      const res = await getHomeFeed({
        userId: userDbId!,
        limit: TIMELINE_PAGE_LIMIT,
        cursor:cursor ?? undefined,
      });
      items = res.items;
      nextCursor = res.nextCursor;
    } else {
      // プロフィールフィード：生データをフェッチ後に署名付きURLに変換
      const rawItems = await prisma.feedItem.findMany({
        where: { userId: userIdOrNull },
        select: feedItemPayload.select,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        cursor: cursorOption,
      });
      if (rawItems.length > TIMELINE_PAGE_LIMIT) {
        const last = rawItems.pop();
        nextCursor = last?.id ?? null;
      }
      items = await Promise.all(rawItems.map(mapAndSignFeedItem));
    }

    return { items, nextCursor };
  } catch (error) {
    console.error("[getPaginatedFeedAction]", error);
    return { items: [], nextCursor: null };
  }
}

/**
 * 指定フィードアイテムをリツイートとして新規作成するアクション
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
    if (original.user?.isPrivate) {
      throw new Error("非公開アカウントの投稿はリツイートできません。");
    }

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.retweet.findUnique({
        where: { userId_feedItemId: { userId: userDbId, feedItemId } },
      });
      if (exists) return { already: true };

      await tx.retweet.create({ data: { userId: userDbId, feedItemId } });
      await tx.feedItem.create({
        data: {
          userId: userDbId,
          type: "RETWEET" as FeedType,
          retweetOfFeedItemId: feedItemId,
        },
      });
      return { already: false };
    });

    if (!result.already) revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[retweetAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "エラーが発生しました。" };
  }
}

/**
 * 指定フィードアイテムのリツイートを取り消すアクション
 */
export async function undoRetweetAction(
  feedItemId: string
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザー情報が見つかりません。" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.retweet.deleteMany({ where: { userId: userDbId, feedItemId } });
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
  } catch (error) {
    console.error("[undoRetweetAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "エラーが発生しました。" };
  }
}

/**
 * 指定フィードアイテムを引用リツイートとして新規作成するアクション
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
  if (!text && !data.imageUrl) {
    return { success: false, error: "コメントまたは画像を指定してください。" };
  }
  if (text.length > 280) {
    return { success: false, error: "コメントは280文字以内です。" };
  }

  try {
    const { newPost, newFeedItem } = await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    console.error("[quoteRetweetAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "エラーが発生しました。" };
  }
}

/**
 * 指定フィードアイテムの引用リツイートを削除するアクション
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
    if (!rec?.postId) throw new Error("削除対象が不正です。");


const postId = rec.postId;
const quotedFeedItemId = rec.quotedFeedItemId;

    await prisma.$transaction(async (tx) => {
   if (quotedFeedItemId) {
     await tx.feedItem.updateMany({
       where: { id: quotedFeedItemId, quoteRetweetCount: { gt: 0 } },
       data: { quoteRetweetCount: { decrement: 1 } },
     });
   }
   await tx.post.delete({ where: { id: postId } });
      await tx.feedItem.delete({ where: { id: feedItemId } });
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[deleteQuoteRetweetAction]", error);
    return { success: false, error: error instanceof Error ? error.message : "エラーが発生しました。" };
  }
}
