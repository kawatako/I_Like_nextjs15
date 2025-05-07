// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client";
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

// --- Zod スキーマ ---
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

// --- 型定義 ---
interface RankingDataForSave {
  subject: string;
  description: string | null;
  listImageUrl?: string | null;
  tags?: string[];
}
interface ItemDataForSave {
  id?: string;
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
}

// --- Server Actions ---

export async function createCompleteRankingAction(
  rankingData: RankingDataForSave,
  itemsData: ItemDataForSave[],
  status: ListStatus
): Promise<ActionResult & { newListId?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };

  // 1. ユーザー情報取得
  let userDbId: string;
  let username: string;
  const userRec = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true },
  });
  if (!userRec?.id || !userRec.username)
    return { success: false, error: "ユーザー情報が見つかりません。" };
  userDbId = userRec.id;
  username = userRec.username;

  // 2. バリデーション
  try {
    SubjectSchema.parse(rankingData.subject);
    DescriptionSchema.parse(rankingData.description ?? "");
    if (itemsData.length > 10) throw new Error("アイテムは10個まで");
    if (status === "PUBLISHED" && itemsData.length === 0)
      throw new Error("公開にはアイテム必須");
    itemsData.forEach((item, i) => {
      ItemNameSchema.parse(item.itemName);
      ItemDescriptionSchema.parse(item.itemDescription ?? "");
      if (
        status === "PUBLISHED" &&
        (!item.itemName || item.itemName.trim() === "")
      ) {
        throw new Error(`${i + 1}番目アイテム名必須`);
      }
    });
    const tags = rankingData.tags ?? [];
    if (tags.some((t) => t.trim().length === 0 || t.length > 30))
      throw new Error("タグ名は1〜30文字");
    if (tags.length > 5) throw new Error("タグは5個まで");
  } catch (e) {
    if (e instanceof z.ZodError)
      return {
        success: false,
        error: e.errors.map((e) => e.message).join("\n"),
      };
    if (e instanceof Error) return { success: false, error: e.message };
    return { success: false, error: "検証中にエラーが発生しました。" };
  }

  // 3. トランザクション
  const newList = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // タグ upsert
      const tags = rankingData.tags ?? [];
      const tagOps = tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((name) => ({
          where: { name },
          create: { name },
        }));
      const upserted = await Promise.all(
        tagOps.map((data) =>
          tx.tag.upsert({
            where: data.where,
            create: data.create,
            update: {},
            select: { id: true },
          })
        )
      );
      const tagIds = upserted.map((t) => ({ id: t.id }));

      // リスト作成
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
      // アイテム作成
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
      // 公開なら FeedItem
      if (status === "PUBLISHED") {
        await tx.feedItem.create({
          data: {
            userId: userDbId,
            type: "RANKING_UPDATE",
            rankingListId: created.id,
          },
        });
      }
      return created;
    }
  );

  // 4. 再検証
  revalidatePath(`/rankings/${newList.id}`);
  revalidatePath(`/profile/${username}`);
  if (status === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath("/trends");
  }

  return { success: true, newListId: newList.id };
}


export async function saveRankingListItemsAction(
  listId: string,
  itemsData: ItemDataForSave[],
  listSubject: string,
  listDescription: string | null,
  listImageUrl: string | null | undefined,
  tags: string[],
  targetStatus: ListStatus
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };

  const userRec = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true },
  });
  if (!userRec?.id) return { success: false, error: "ユーザー情報が見つかりません。" };
  const userDbId = userRec.id;

  // バリデーション（省略）

  // 権限チェック
  const list = await prisma.rankingList.findUnique({
    where: { id: listId, authorId: userDbId },
    select: { id: true, status: true },
  });
  if (!list) return { success: false, error: "編集権限がありません。" };

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // タグ upsert
    const tagOps = tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((name) => ({ where: { name }, create: { name } }));
    const upserted = await Promise.all(
      tagOps.map((data) =>
        tx.tag.upsert({ where: data.where, create: data.create, update: {}, select: { id: true } })
      )
    );
    const tagIds = upserted.map((t) => ({ id: t.id }));

    // アイテム全削除 → 再作成
    await tx.rankedItem.deleteMany({ where: { listId } });
    if (itemsData.length > 0) {
      await tx.rankedItem.createMany({
        data: itemsData.map((item, i) => ({
          listId,
          rank: i + 1,
          itemName: item.itemName.trim(),
          itemDescription: item.itemDescription?.trim() || null,
          imageUrl: item.imageUrl || null,
        })),
      });
    }

    // 本体更新
    await tx.rankingList.update({
      where: { id: listId, authorId: userDbId },
      data: {
        subject: listSubject.trim(),
        description: listDescription?.trim() || null,
        status: targetStatus,
        listImageUrl: listImageUrl || null,
        tags: { set: tagIds },
      },
    });

    // 公開状態変化に合わせて FeedItem upsert
    if (targetStatus === "PUBLISHED") {
      await tx.feedItem.upsert({
        where: {
          rankingListId_type: { rankingListId: listId, type: "RANKING_UPDATE" },
        },
        create: { userId: userDbId, type: "RANKING_UPDATE", rankingListId: listId },
        update: { updatedAt: new Date() },
      });
    }
  });

  const username = userRec.username!;
  revalidatePath(`/rankings/${listId}/edit`);
  revalidatePath(`/rankings/${listId}`);
  revalidatePath(`/profile/${username}`);
  if (targetStatus === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath("/trends");
  }

  return { success: true };
}


export async function deleteRankingListAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  const listId = formData.get("listId") as string;
  const userRec = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true },
  });
  const userDbId = userRec?.id!;
  // トランザクションで削除
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.feedItem.deleteMany({
      where: { rankingListId: listId, type: "RANKING_UPDATE" },
    });
    const res = await tx.rankingList.deleteMany({
      where: { id: listId, authorId: userDbId },
    });
    if (res.count === 0) throw new Error("権限がありません。");
  });
  const username = userRec?.username!;
  redirect(username ? `/profile/${username}` : "/");
}


export async function updateRankingListOrderAction(
  orderedListIds: string[]
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  const userRec = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true },
  });
  const userDbId = userRec?.id!;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await Promise.all(
      orderedListIds.map((id, idx) =>
        tx.rankingList.updateMany({
          where: { id, authorId: userDbId },
          data: { displayOrder: idx },
        })
      )
    );
  });
  revalidatePath(`/profile/${userRec?.username}`);
  return { success: true };
}


export async function loadMoreProfileRankingsAction(
  targetUserId: string,
  status: ListStatus,
  cursor: string | null
): Promise<PaginatedResponse<RankingListSnippet>> {
  return getProfileRankingsPaginated({
    userId: targetUserId,
    status,
    limit: 10,
    cursor: cursor ?? undefined,
  });
}
