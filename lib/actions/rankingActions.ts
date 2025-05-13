// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client";
import { safeQuery } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileRankingsPaginated } from "@/lib/data/rankingQueries";
import type { Prisma } from "@prisma/client";
import type {
  ActionResult,
  PaginatedResponse,
  RankingListSnippet,
  ListStatus,
} from "@/lib/types";

// --- Zod スキーマ定義 ---
// 各フィールドのバリデーションルールを定義
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9 ]+$/u;
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

// --- ヘルパー関数 ---

/**
 * 認証済みユーザーの取得とDB ID／usernameの取得
 * @throws 認証失敗やユーザー未登録時にエラー
 */
async function requireUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("ログインしてください。");
  const rec = await safeQuery(() =>
    prisma.user.findUnique({ where: { clerkId }, select: { id: true, username: true } })
  );
  if (!rec?.id || !rec.username) throw new Error("ユーザー情報が見つかりません。");
  return { userDbId: rec.id, username: rec.username };
}

/**
 * Transaction内でタグをUpsertし、ID配列を返す
 * 空配列や重複タグを除外
 */
async function upsertTags(tx: Prisma.TransactionClient, tags?: string[]) {
  if (!tags || tags.length === 0) return [];
  const ops = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((name) => ({ where: { name }, create: { name } }));
  const ups = await Promise.all(
    ops.map((op) =>
      tx.tag.upsert({ where: op.where, create: op.create, update: {}, select: { id: true } })
    )
  );
  return ups.map((u) => ({ id: u.id }));
}

/**
 * Prisma transactionの実行をラップしてsafeQueryを適用
 */
function runTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return safeQuery(() => prisma.$transaction(fn));
}

/**
 * ランキング作成・編集後のキャッシュ再検証をまとめて実行
 */
function revalidateAfter(listId: string, username: string, status: ListStatus) {
  revalidatePath(`/rankings/${listId}`);
  revalidatePath(`/rankings/${listId}/edit`);
  revalidatePath(`/profile/${username}`);
  if (status === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath("/trends");
  }
}

/**
 * 完整なランキングを作成し、タグ・アイテムを登録し、公開時はFeedItemも生成
 */
export async function createCompleteRankingAction(
  rankingData: { subject: string; description: string | null; listImageUrl?: string | null; tags?: string[] },
  itemsData: { itemName: string; itemDescription?: string | null; imageUrl?: string | null }[],
  status: ListStatus
): Promise<ActionResult & { newListId?: string }> {
  const { userDbId, username } = await requireUser();

  // バリデーション
  SubjectSchema.parse(rankingData.subject);
  DescriptionSchema.parse(rankingData.description ?? "");
  if (itemsData.length > 10) throw new Error("アイテムは10個まで");
  if (status === "PUBLISHED" && itemsData.length === 0) throw new Error("公開にはアイテム必須");
  itemsData.forEach((item, i) => {
    ItemNameSchema.parse(item.itemName);
    ItemDescriptionSchema.parse(item.itemDescription ?? "");
    if (status === "PUBLISHED" && !item.itemName.trim()) throw new Error(`${i + 1}番目アイテム名必須`);
  });

  // タグUpsert
  const tagIds = await runTx((tx) => upsertTags(tx, rankingData.tags));

  // トランザクション実行
  const newList = await runTx(async (tx) => {
    const created = await tx.rankingList.create({
      data: {
        authorId: userDbId,
        subject: rankingData.subject.trim(),
        description: rankingData.description?.trim() || null,
        status,
        listImageUrl: rankingData.listImageUrl || null,
        tags: { connect: tagIds },
      },
    });
    if (itemsData.length > 0) {
      await tx.rankedItem.createMany({
        data: itemsData.map((item, i) => ({
          listId: created.id,
          rank: i + 1,
          itemName: item.itemName.trim(),
          itemDescription: item.itemDescription?.trim() || null,
          imageUrl: item.imageUrl || null,
        })),
      });
    }
    if (status === "PUBLISHED") {
      await tx.feedItem.create({
        data: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: created.id },
      });
    }
    return created;
  });

  // キャッシュ再検証
  revalidateAfter(newList.id, username, status);
  return { success: true, newListId: newList.id };
}

/**
 * 既存ランキングのアイテム構成を更新し、タグ・FeedItemも整合
 */
export async function saveRankingListItemsAction(
  listId: string,
  itemsData: { itemName: string; itemDescription?: string | null; imageUrl?: string | null }[],
  listSubject: string,
  listDescription: string | null,
  listImageUrl: string | null | undefined,
  tags: string[],
  targetStatus: ListStatus
): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  const list = await safeQuery(() =>
    prisma.rankingList.findUnique({ where: { id: listId, authorId: userDbId }, select: { id: true } })
  );
  if (!list) return { success: false, error: "編集権限がありません。" };

  // トランザクション実行
  await runTx(async (tx) => {
    const tagIds = await upsertTags(tx, tags);
    await tx.rankedItem.deleteMany({ where: { listId } });
    if (itemsData.length > 0) {
      await tx.rankedItem.createMany({
        data: itemsData.map((item, i) => ({ listId, rank: i + 1, itemName: item.itemName.trim(), itemDescription: item.itemDescription?.trim() || null, imageUrl: item.imageUrl || null })),
      });
    }
    await tx.rankingList.update({
      where: { id: listId, authorId: userDbId },
      data: { subject: listSubject.trim(), description: listDescription?.trim() || null, status: targetStatus, listImageUrl: listImageUrl || null, tags: { set: tagIds } },
    });
    if (targetStatus === "PUBLISHED") {
      await tx.feedItem.upsert({
        where: { rankingListId_type: { rankingListId: listId, type: "RANKING_UPDATE" } },
        create: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: listId },
        update: { updatedAt: new Date() },
      });
    }
  });

  revalidateAfter(listId, username, targetStatus);
  return { success: true };
}

/**
 * ランキングと関連FeedItemを削除し、権限チェック後にリダイレクト
 */
export async function deleteRankingListAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  const listId = formData.get("listId") as string;
  await runTx(async (tx) => {
    await tx.feedItem.deleteMany({ where: { rankingListId: listId, type: "RANKING_UPDATE" } });
    const res = await tx.rankingList.deleteMany({ where: { id: listId, authorId: userDbId } });
    if (res.count === 0) throw new Error("権限がありません。");
  });
  redirect(username ? `/profile/${username}` : "/");
}

/**
 * ユーザーのランキングリスト表示順を一括更新
 */
export async function updateRankingListOrderAction(
  orderedListIds: string[]
): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  await runTx(async (tx) => {
    await Promise.all(
      orderedListIds.map((id, idx) => tx.rankingList.updateMany({ where: { id, authorId: userDbId }, data: { displayOrder: idx } }))
    );
  });
  revalidatePath(`/profile/${username}`);
  return { success: true };
}

/**
 * プロフィール別のランキングリストをページネーションで取得（次ページ読み込み）
 */
export async function loadMoreProfileRankingsAction(
  targetUserId: string,
  status: ListStatus,
  cursor: string | null
): Promise<PaginatedResponse<RankingListSnippet>> {
  return getProfileRankingsPaginated({ userId: targetUserId, status, limit: 10, cursor: cursor ?? undefined });
}
