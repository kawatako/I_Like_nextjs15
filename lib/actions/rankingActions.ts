// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Sentiment, Prisma, ListStatus, FeedType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getProfileRankingsPaginated } from "@/lib/data/rankingQueries";
import {
  type RankingSnippetForProfile} from "@/lib/types"
import type { ActionResult, PaginatedResponse } from "@/lib/types";


// --- Zod スキーマ ---
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "ランキングのテーマを入力してください。")
  .max(50, "テーマは50字以内で入力してください。")
  .regex(subjectAllowedCharsRegex, {
    message: "テーマには日本語、英数字、半角スペースのみ使用できます。",
  });
const DescriptionSchema = z
  .string()
  .trim()
  .max(500, "説明は500字以内です。")
  .optional();
// ★ 追加: アイテム用 Zod スキーマ ★
const ItemNameSchema = z
  .string()
  .trim()
  .min(1, "アイテム名は必須です。")
  .max(100, "アイテム名は100字以内です。");
const ItemDescriptionSchema = z
  .string()
  .trim()
  .max(500, "アイテム説明は500字以内です。")
  .optional();
// TODO: 必要であれば imageUrl の Zod スキーマも定義

// --- 型定義 ---
// ランキング保存アクション用 (既存)
interface ItemDataForSave {
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
}

// ★ 追加: 新規ランキング一括作成アクション用 ★
interface ItemDataForCreate {
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null; // 将来用
}
type CreateCompleteRankingResult = { success: boolean; error?: string; newListId?: string; };

// ランキング全体保存・更新アクション (Edit フロー用)
export async function saveRankingListItemsAction(
  listId: string,
  itemsData: ItemDataForSave[],
  listSubject: string,
  listDescription: string | null,
  targetStatus: ListStatus
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  try {
    SubjectSchema.parse(listSubject);
    if (itemsData.length > 10) {
      throw new Error("アイテムは10個までしか登録できません。");
    }
    itemsData.forEach((item, index) => {
      if (!item.itemName || item.itemName.trim() === "") {
        throw new Error(`${index + 1}番目のアイテム名が入力されていません。`);
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => e.message).join("\n"),
        success: false,
      };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "入力内容の検証中にエラーが発生しました。",
    };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });
    if (!user) {
      throw new Error("データベースにユーザーが見つかりません。");
    }
    const userDbId = user.id;
    const list = await prisma.rankingList.findUnique({
      where: { id: listId, authorId: userDbId },
      select: { id: true },
    });
    if (!list) {
      throw new Error("リストが見つからないか、編集権限がありません。");
    }
    await prisma.$transaction(async (tx) => {
      await tx.rankedItem.deleteMany({ where: { listId: listId } });
      if (itemsData.length > 0) {
        await tx.rankedItem.createMany({
          data: itemsData.map((item, index) => ({
            listId: listId,
            itemName: item.itemName.trim(),
            rank: index + 1,
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: item.imageUrl?.trim() || null,
          })),
        });
      }
      await tx.rankingList.update({
        where: { id: listId, authorId: userDbId },
        data: {
          subject: listSubject.trim(),
          description: listDescription?.trim() || null,
          status: targetStatus,
          updatedAt: new Date(),
        },
      });
    });
    console.log(
      `RankingList ${listId} and its items saved with status ${targetStatus}`
    );
    if (targetStatus === ListStatus.PUBLISHED) {
      try {
        await prisma.feedItem.create({
          data: {
            userId: userDbId,
            type: FeedType.RANKING_UPDATE,
            rankingListId: listId,
          },
        });
        console.log(`FeedItem (RANKING_UPDATE) created for list ${listId}`);
      } catch (feedError) {
        console.error(
          `Failed to create FeedItem for ranking list ${listId}:`,
          feedError
        );
      }
    }
    revalidatePath(`/rankings/${listId}/edit`);
    revalidatePath(`/rankings/${listId}`);
    if (targetStatus === ListStatus.PUBLISHED) {
      const listAuthor = await prisma.user.findUnique({
        where: { id: userDbId },
        select: { username: true },
      });
      if (listAuthor?.username) {
        revalidatePath(`/profile/${listAuthor.username}`);
      }
      revalidatePath("/");
      revalidatePath("/trends");
    }
    return { success: true };
  } catch (error) {
    console.error(`Error saving ranking list ${listId}:`, error);
    let returnState: ActionResult;
    if (error instanceof Error) {
      returnState = { success: false, error: error.message };
    } else {
      returnState = {
        success: false,
        error: "リストの保存中に予期せぬエラーが発生しました。",
      };
    }
    return returnState;
  }
}

// ランキング削除アクション
export async function deleteRankingListAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  const listId = formData.get("listId") as string;
  if (!listId) {
    return { success: false, error: "リストIDが指定されていません。" };
  }
  let user: { id: string; username: string | null } | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true, username: true },
    });
    if (!user) {
      throw new Error("データベースにユーザーが見つかりません。");
    }
    const userDbId = user.id;
    // TODO: 削除時に FeedItem も削除するか検討
    const result = await prisma.rankingList.deleteMany({
      where: { id: listId, authorId: userDbId },
    });
    if (result.count === 0) {
      throw new Error("リストが見つからないか、削除権限がありません。");
    }
    console.log(
      `RankingList ${listId} deleted successfully by user ${userDbId}`
    );
    if (user.username) {
      revalidatePath(`/profile/${user.username}`);
    }
    revalidatePath("/");
    revalidatePath("/trends");
    revalidatePath(`/rankings/${listId}`);
  } catch (error) {
    console.error(`Error deleting ranking list ${listId}:`, error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "リストの削除中に予期せぬエラーが発生しました。";
    return { success: false, error: errorMessage };
  }
  if (user?.username) {
    redirect(`/profile/${user.username}`);
  } else {
    console.warn(
      `Username not found for redirect after deleting list ${listId}.`
    );
    redirect("/");
  }
}

// 並び替え順序保存アクション
export async function updateRankingListOrderAction(
  orderedListIds: string[]
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  let userDbId: string | null = null;
  let username: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true, username: true },
    });
    if (!user?.id || !user?.username) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    userDbId = user.id;
    username = user.username;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ユーザー情報の取得に失敗しました。";
    return { success: false, error: message };
  }
  if (!Array.isArray(orderedListIds)) {
    return { success: false, error: "無効なデータ形式です。" };
  }
  console.log(
    `[Action/updateRankingOrder] Updating order for user ${userDbId}, lists:`,
    orderedListIds
  );
  try {
    await prisma.$transaction(async (tx) => {
      const updates = orderedListIds.map((listId, index) =>
        tx.rankingList.updateMany({
          where: { id: listId, authorId: userDbId },
          data: { displayOrder: index },
        })
      );
      await Promise.all(updates);
    });
    console.log(
      `[Action/updateRankingOrder] Successfully updated order for user ${userDbId}`
    );
    if (username) {
      revalidatePath(`/profile/${username}`);
    }
    return { success: true };
  } catch (error) {
    console.error(
      "[updateRankingOrderAction] Error updating ranking list order:",
      error
    );
    return {
      success: false,
      error: "ランキングの順序更新中にエラーが発生しました。",
    };
  }
}

// プロフィールランキング無限スクロール用アクション
const PROFILE_RANKING_LIMIT = 10;
export async function loadMoreProfileRankingsAction(
  targetUserId: string,
  status: ListStatus,
  cursor: string | null
): Promise<PaginatedResponse<RankingSnippetForProfile>> {
  // Optional Auth Check
  console.log(
    `[Action/loadMoreProfileRankings] Loading ${status} for ${targetUserId}, cursor: ${cursor}`
  );
  if (!targetUserId || !status) {
    return { items: [], nextCursor: null };
  }
  try {
    const result = await getProfileRankingsPaginated({
      userId: targetUserId,
      status: status,
      limit: PROFILE_RANKING_LIMIT,
      cursor: cursor ?? undefined,
    });
    return result;
  } catch (error) {
    console.error(
      "[Action/loadMoreProfileRankings] Error fetching more rankings:",
      error
    );
    return { items: [], nextCursor: null };
  }
}

/**
 * 新しいランキングリストとアイテムを一括で作成・保存する Server Action
 * @param rankingData - ランキングの基本情報 { sentiment, subject, description }
 * @param itemsData - ランキングアイテムの配列 [{ itemName, itemDescription?, imageUrl? }]
 * @param status - 保存するステータス (DRAFT or PUBLISHED)
 * @returns CreateCompleteRankingResult
 */
export async function createCompleteRankingAction(
  rankingData: {
    sentiment: Sentiment | null;
    subject: string;
    description: string | null;
  },
  itemsData: ItemDataForCreate[],
  status: ListStatus
): Promise<CreateCompleteRankingResult> {
  // ★ 戻り値の型を追加 ★

  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  // 2. DBユーザーIDを取得
  let userDbId: string | null = null;
  let username: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true, username: true },
    });
    if (!user?.id || !user?.username) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    userDbId = user.id;
    username = user.username;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ユーザー情報の取得に失敗しました。";
    return { success: false, error: message };
  }

  // 3. 入力バリデーション (サーバーサイド)
  try {
    if (!rankingData.sentiment) {
      throw new Error("ランキングの種類が選択されていません。");
    }
    SubjectSchema.parse(rankingData.subject);
    DescriptionSchema.parse(rankingData.description ?? "");
    if (itemsData.length > 10) {
      throw new Error("アイテムは10個までしか登録できません。");
    }
    if (status === ListStatus.PUBLISHED && itemsData.length === 0) {
      throw new Error("公開するにはアイテムを1つ以上登録してください。");
    }
    itemsData.forEach((item, index) => {
      ItemNameSchema.parse(item.itemName);
      ItemDescriptionSchema.parse(item.itemDescription ?? "");
      // TODO: imageUrl のバリデーション
      if (
        status === ListStatus.PUBLISHED &&
        (!item.itemName || item.itemName.trim() === "")
      ) {
        throw new Error(
          `公開するには、${index + 1}番目のアイテム名を入力してください。`
        );
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => e.message).join("\n"),
        success: false,
      };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "入力内容の検証中にエラーが発生しました。",
    };
  }

  console.log(
    `[Action/createCompleteRanking] Attempting creation by user ${userDbId}, status: ${status}`
  );

  try {
    // 4. データベースへの書き込み (トランザクション)
    const newList = await prisma.$transaction(async (tx) => {
      const createdList = await tx.rankingList.create({
        data: {
          authorId: userDbId,
          sentiment: rankingData.sentiment!,
          subject: rankingData.subject.trim(),
          description: rankingData.description?.trim() || null,
          status: status,
          displayOrder: null,
        },
      });
      if (itemsData.length > 0) {
        await tx.rankedItem.createMany({
          data: itemsData.map((item, index) => ({
            listId: createdList.id,
            rank: index + 1,
            itemName: item.itemName.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: item.imageUrl?.trim() || null,
          })),
        });
      }
      if (status === ListStatus.PUBLISHED) {
        await tx.feedItem.create({
          data: {
            userId: userDbId,
            type: FeedType.RANKING_UPDATE,
            rankingListId: createdList.id,
          },
        });
        console.log(
          `FeedItem (RANKING_UPDATE) created for new list ${createdList.id}`
        );
      }
      return createdList;
    });

    console.log(
      `[Action/createCompleteRanking] Successfully created RankingList ${newList.id} with ${itemsData.length} items by user ${userDbId}`
    );

    // 5. キャッシュ再検証
    revalidatePath(`/rankings/${newList.id}`);
    if (username) {
      revalidatePath(`/profile/${username}`);
      if (status === ListStatus.PUBLISHED) {
        revalidatePath("/");
        revalidatePath("/trends");
      }
    }

    // 6. 成功結果を返す
    return { success: true, newListId: newList.id };
  } catch (error) {
    // 7. エラーハンドリング
    console.error(
      "[Action/createCompleteRanking] Error creating complete ranking list:",
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "ランキングの作成中に予期せぬエラーが発生しました。";
    return { success: false, error: message };
  }
}
