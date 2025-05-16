// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfileRankingsPaginated } from "@/lib/data/rankingQueries";
import { supabaseAdmin } from "@/lib/utils/storage";
import type {
  ActionResult,
  PaginatedResponse,
  RankingListSnippet,
  ListStatus,
} from "@/lib/types";

/** 認証済みユーザーの DB ID と username を取得 */
async function requireUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("ログインしてください。");

  const rec = await safeQuery(() =>
    prisma.user.findUnique({ where: { clerkId }, select: { id: true, username: true } })
  );
  if (!rec?.id || !rec.username) throw new Error("ユーザー情報が見つかりません。");
  return { userDbId: rec.id, username: rec.username };
}

/** トランザクション内でタグを upsert し、ID 配列を返す */
async function upsertTags(tx: any, tags?: string[]): Promise<{ id: string }[]> {
  if (!tags || tags.length === 0) return [];
  const ops = tags.map((t) => t.trim()).filter(Boolean).map((name) => ({ where: { name }, create: { name } }));
  const ups = await Promise.all(
    ops.map((op) =>
      tx.tag.upsert({ where: op.where, create: op.create, update: {}, select: { id: true } })
    )
  );
  return ups.map((u: any) => ({ id: u.id }));
}

/** 単独トランザクション: タグ更新 */
async function updateTags(listId: string, tags: string[]) {
  await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTags(tx, tags);
    await tx.rankingListTag.deleteMany({ where: { listId } });
    if (tagIds.length > 0) {
      await tx.rankingListTag.createMany({ data: tagIds.map((t) => ({ listId, tagId: t.id })) });
    }
  });
}

// Zod スキーマ
const subjectAllowed = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9 ]+$/u;
const SubjectSchema = z.string().trim().min(1).max(50).regex(subjectAllowed);
const DescriptionSchema = z.string().trim().max(500).optional();
const ItemNameSchema = z.string().trim().min(1).max(100);
const ItemDescSchema = z.string().trim().max(500).optional();

/** 新規ランキング作成 */
export async function createCompleteRankingAction(
  rankingData: { subject: string; description: string | null; listImageUrl?: string | null; tags?: string[] },
  itemsData: { itemName: string; itemDescription?: string | null; imageUrl?: string | null }[],
  status: ListStatus
): Promise<ActionResult & { newListId?: string }> {
  const { userDbId, username } = await requireUser();
  SubjectSchema.parse(rankingData.subject);
  DescriptionSchema.parse(rankingData.description ?? "");
  if (itemsData.length > 10) throw new Error("アイテムは10個までです。");
  if (status === "PUBLISHED" && itemsData.length === 0) throw new Error("公開にはアイテムが必要です。");
  itemsData.forEach((item, i) => {
    ItemNameSchema.parse(item.itemName);
    ItemDescSchema.parse(item.itemDescription ?? "");
    if (status === "PUBLISHED" && !item.itemName.trim()) throw new Error(`${i+1}番目のアイテム名が必要です。`);
  });

  const newList = await safeQuery(() =>
    prisma.$transaction(async (tx) => {
      // タグ挿入
      const tagIds = await upsertTags(tx, rankingData.tags);
      const created = await tx.rankingList.create({
        data: { authorId: userDbId, subject: rankingData.subject.trim(), description: rankingData.description?.trim() || null, status, listImageUrl: rankingData.listImageUrl || null }
      });
      if (tagIds.length) await tx.rankingListTag.createMany({ data: tagIds.map((t) => ({ listId: created.id, tagId: t.id })) });
      // アイテム挿入
      if (itemsData.length) await tx.rankedItem.createMany({ data: itemsData.map((item, idx) => ({ listId: created.id, rank: idx+1, itemName: item.itemName.trim(), itemDescription: item.itemDescription?.trim()||null, imageUrl: item.imageUrl||null })) });
      // フィード作成
      if (status === "PUBLISHED") await tx.feedItem.create({ data: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: created.id } });
      return created;
    })
  );

  revalidatePath(`/rankings/${newList.id}`);
  revalidatePath(`/profile/${username}`);
  if (status === "PUBLISHED") { revalidatePath(`/`); revalidatePath(`/trends`); }
  return { success: true, newListId: newList.id };
}

/** ランキング更新 + 古い画像削除 */
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
  // 権限チェック
  const exist = await safeQuery(() => prisma.rankingList.findUnique({ where: { id: listId, authorId: userDbId }, select: { id: true } }));
  if (!exist) return { success: false, error: "編集権限がありません。" };
  // ① 古い画像パス取得
  const prevItems = await safeQuery(() => prisma.rankedItem.findMany({ where: { listId }, select: { imageUrl: true } }));
  const keepPaths = new Set(itemsData.map((d) => d.imageUrl).filter(Boolean));
  const toRemove = prevItems.map((i) => i.imageUrl).filter((p) => p && !keepPaths.has(p));
  // ② 削除
  if (toRemove.length) {
    supabaseAdmin.storage.from("i-like").remove(toRemove as string[]).catch(console.error);
  }
  // ③ タグ更新
  await updateTags(listId, tags);
  // ④ アイテム+メタ+フィード更新
  await safeQuery(() =>
    prisma.$transaction(async (tx) => {
      await tx.rankedItem.deleteMany({ where: { listId } });
      if (itemsData.length) await tx.rankedItem.createMany({ data: itemsData.map((item, idx) => ({ listId, rank: idx+1, itemName: item.itemName.trim(), itemDescription: item.itemDescription?.trim()||null, imageUrl: item.imageUrl||null })) });
      await tx.rankingList.update({ where: { id: listId, authorId: userDbId }, data: { subject: listSubject.trim(), description: listDescription?.trim()||null, status: targetStatus, listImageUrl: listImageUrl||null } });
      if (targetStatus === "PUBLISHED") await tx.feedItem.upsert({ where: { rankingListId_type: { rankingListId: listId, type: "RANKING_UPDATE" } }, create: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: listId }, update: { updatedAt: new Date() } });
    })
  );
  // 再検証
  revalidatePath(`/rankings/${listId}/edit`);
  revalidatePath(`/rankings/${listId}`);
  revalidatePath(`/profile/${username}`);
  if (targetStatus === "PUBLISHED") { revalidatePath(`/`); revalidatePath(`/trends`); }
  return { success: true };
}

/** ランキング削除 */
export async function deleteRankingListAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  const listId = formData.get("listId") as string;
  await safeQuery(() => prisma.$transaction([prisma.feedItem.deleteMany({ where: { rankingListId: listId, type: "RANKING_UPDATE" } }), prisma.rankingList.deleteMany({ where: { id: listId, authorId: userDbId } })]));
  redirect(username ? `/profile/${username}` : "/");
  return { success: true };
}

/** 順序更新 */
export async function updateRankingListOrderAction(orderedListIds: string[]): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  await safeQuery(() => prisma.$transaction(orderedListIds.map((id, idx) => prisma.rankingList.updateMany({ where: { id, authorId: userDbId }, data: { displayOrder: idx } }))));
  revalidatePath(`/profile/${username}`);
  return { success: true };
}

/** プロフィール別ランキングの次ページ */
export async function loadMoreProfileRankingsAction(
  targetUserId: string,
  status: ListStatus,
  cursor: string | null
): Promise<PaginatedResponse<RankingListSnippet>> {
  return getProfileRankingsPaginated({ userId: targetUserId, status, limit: 10, cursor: cursor ?? undefined });
}
