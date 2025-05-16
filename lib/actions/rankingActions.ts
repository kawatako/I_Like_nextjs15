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
    prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, username: true },
    })
  );
  if (!rec?.id || !rec.username) throw new Error("ユーザー情報が見つかりません。");
  return { userDbId: rec.id, username: rec.username };
}

/** トランザクション内でタグを upsert し、ID 配列を返す */
async function upsertTags(tx: any, tags?: string[]): Promise<{ id: string }[]> {
  if (!tags || tags.length === 0) return [];

  const ops = tags.map((t) => t.trim()).filter((t) => t.length > 0).map((name) => ({ where: { name }, create: { name } }));
  const ups = await Promise.all(
    ops.map((op) =>
      tx.tag.upsert({
        where: op.where,
        create: op.create,
        update: {},
        select: { id: true },
      })
    )
  );
  return ups.map((u: any) => ({ id: u.id }));
}

/** タグ & pivot 更新 */
async function updateTags(listId: string, tags: string[]) {
  await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTags(tx, tags);
    await tx.rankingListTag.deleteMany({ where: { listId } });
    if (tagIds.length > 0) {
      await tx.rankingListTag.createMany({
        data: tagIds.map((t) => ({ listId, tagId: t.id })),
      });
    }
  });
}

// Zod スキーマ
const subjectAllowed = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9 ]+$/u;
const SubjectSchema = z.string().trim().min(1, "テーマを入力してください。").max(50, "テーマは50字以内です。").regex(subjectAllowed, "日本語・英数字・半角スペースのみ使用できます。");
const DescriptionSchema = z.string().trim().max(500, "説明は500字以内です。").optional();
const ItemNameSchema = z.string().trim().min(1, "アイテム名は必須です。").max(100, "アイテム名は100字以内です。");
const ItemDescSchema = z.string().trim().max(500, "説明は500字以内です。").optional();

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
    if (status === "PUBLISHED" && !item.itemName.trim()) throw new Error(`${i + 1}番目のアイテム名が必要です。`);
  });

  try {
    const newList = await safeQuery(() =>
      prisma.$transaction(async (tx) => {
        const tagIds = await upsertTags(tx, rankingData.tags);
        const created = await tx.rankingList.create({
          data: {
            authorId: userDbId,
            subject: rankingData.subject.trim(),
            description: rankingData.description?.trim() || null,
            status,
            listImageUrl: rankingData.listImageUrl || null,
          },
        });
        if (tagIds.length > 0) {
          await tx.rankingListTag.createMany({ data: tagIds.map((t) => ({ listId: created.id, tagId: t.id })) });
        }
        if (itemsData.length > 0) {
          await tx.rankedItem.createMany({ data: itemsData.map((item, idx) => ({ listId: created.id, rank: idx + 1, itemName: item.itemName.trim(), itemDescription: item.itemDescription?.trim() || null, imageUrl: item.imageUrl || null })) });
        }
        if (status === "PUBLISHED") {
          await tx.feedItem.create({ data: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: created.id } });
        }
        return created;
      })
    );
    revalidatePath(`/rankings/${newList.id}`);
    revalidatePath(`/profile/${username}`);
    if (status === "PUBLISHED") {
      revalidatePath("/");
      revalidatePath("/trends");
    }
    return { success: true, newListId: newList.id };
  } catch (err: any) {
    console.error("[createCompleteRankingAction]", err);
    return { success: false, error: err.message || "作成中にエラーが発生しました。" };
  }
}

/** 既存ランキング更新 */
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
  const list = await safeQuery(() => prisma.rankingList.findUnique({ where: { id: listId, authorId: userDbId }, select: { id: true } }));
  if (!list) return { success: false, error: "編集権限がありません。" };

  // ① 古いアイテム画像パスを取得
  const prevItems = await safeQuery(() => prisma.rankedItem.findMany({ where: { listId }, select: { imageUrl: true } }));
  const oldPaths = prevItems.map((i) => i.imageUrl).filter((p): p is string => !!p);

  try {
    // タグ更新
    await updateTags(listId, tags);
    // アイテム&メタ&フィード更新
    await safeQuery(() =>
      prisma.$transaction(async (tx) => {
        await tx.rankedItem.deleteMany({ where: { listId } });
        if (itemsData.length > 0) {
          await tx.rankedItem.createMany({ data: itemsData.map((item, idx) => ({ listId, rank: idx + 1, itemName: item.itemName.trim(), itemDescription: item.itemDescription?.trim() || null, imageUrl: item.imageUrl || null })) });
        }
        await tx.rankingList.update({ where: { id: listId, authorId: userDbId }, data: { subject: listSubject.trim(), description: listDescription?.trim() || null, status: targetStatus, listImageUrl: listImageUrl || null } });
        if (targetStatus === "PUBLISHED") {
          await tx.feedItem.upsert({ where: { rankingListId_type: { rankingListId: listId, type: "RANKING_UPDATE" } }, create: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: listId }, update: { updatedAt: new Date() } });
        }
      })
    );

    // ② 差し替えで不要になった画像を削除
    const newPaths = itemsData.map((i) => i.imageUrl).filter((p): p is string => !!p);
    const toRemove = oldPaths.filter((p) => !newPaths.includes(p));
    if (toRemove.length > 0) {
      supabaseAdmin.storage.from("i-like").remove(toRemove).catch((e) => console.error("古いアイテム画像削除失敗:", e));
    }

    // キャッシュ再検証
    revalidatePath(`/rankings/${listId}/edit`);
    revalidatePath(`/rankings/${listId}`);
    revalidatePath(`/profile/${username}`);
    if (targetStatus === "PUBLISHED") {
      revalidatePath("/");
      revalidatePath("/trends");
    }
    return { success: true };
  } catch (err: any) {
    console.error("[saveRankingListItemsAction]", err);
    return { success: false, error: err.message || "更新中にエラーが発生しました。" };
  }
}

/** 以下変更なし */
export async function deleteRankingListAction(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  const listId = formData.get("listId") as string;
  await safeQuery(() => prisma.$transaction([prisma.feedItem.deleteMany({ where: { rankingListId: listId, type: "RANKING_UPDATE" } }), prisma.rankingList.deleteMany({ where: { id: listId, authorId: userDbId } })]));
  redirect(username ? `/profile/${username}` : "/");
  return { success: true };
}

export async function updateRankingListOrderAction(orderedListIds: string[]): Promise<ActionResult> {
  const { userDbId, username } = await requireUser();
  await safeQuery(() => prisma.$transaction(orderedListIds.map((id, idx) => prisma.rankingList.updateMany({ where: { id, authorId: userDbId }, data: { displayOrder: idx } }))));
  revalidatePath(`/profile/${username}`);
  return { success: true };
}

export async function loadMoreProfileRankingsAction(targetUserId: string, status: ListStatus, cursor: string | null): Promise<PaginatedResponse<RankingListSnippet>> {
  return getProfileRankingsPaginated({ userId: targetUserId, status, limit: 10, cursor: cursor ?? undefined });
}
