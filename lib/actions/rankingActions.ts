// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, ListStatus, FeedType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getProfileRankingsPaginated } from "@/lib/data/rankingQueries";
import {
  type RankingListSnippet} from "@/lib/types"
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
interface RankingDataForSave {
  subject: string;
  description: string | null;
  listImageUrl?: string | null; // リストヘッダー画像 URL (任意)
  tags?: string[];
}

interface ItemDataForSave {
  id?: string;
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
}

interface CreateRankingData extends Omit<RankingDataForSave, 'listImageUrl'> { // listImageUrl は別引数でも良い
  listImageUrl?: string | null;
}

// --- Server Actions ---

/**
* @param rankingData - ランキングの基本情報 { subject, description, listImageUrl?, tags? }
* @param itemsData - ランキングアイテムの配列 [{ itemName, itemDescription?, imageUrl? }]
* @param status - 保存するステータス (DRAFT or PUBLISHED)
* @returns ActionResult & { newListId?: string }
*/
export async function createCompleteRankingAction(
  rankingData: RankingDataForSave,
  itemsData: ItemDataForSave[],     // ★ 引数の型を変更 ★
  status: ListStatus
): Promise<ActionResult & { newListId?: string }> { // 戻り値に newListId を含める

  // 1. 認証チェック & ユーザー情報取得
  const { userId: clerkId } = await auth();
  if (!clerkId) { return { success: false, error: "ログインしてください。" }; }
  let userDbId: string | null = null;
  let username: string | null = null;
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId }, select: { id: true, username: true } });
    if (!user?.id || !user?.username) { throw new Error("ユーザー情報が見つかりません。"); }
    userDbId = user.id;
    username = user.username;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ユーザー情報の取得に失敗しました。";
    return { success: false, error: message };
  }

  // 2. 入力バリデーション (sentiment 削除)
  const tags = rankingData.tags ?? []; // ★ rankingData.tags でアクセス ★
  try {
    SubjectSchema.parse(rankingData.subject);
    DescriptionSchema.parse(rankingData.description ?? "");
    if (itemsData.length > 10) throw new Error("アイテムは10個まで");
    if (status === ListStatus.PUBLISHED && itemsData.length === 0) throw new Error("公開にはアイテム必須");
    // ★ forEach の item に型注釈を追加 ★
    itemsData.forEach((item: ItemDataForSave, index: number) => {
      ItemNameSchema.parse(item.itemName);
      ItemDescriptionSchema.parse(item.itemDescription ?? "");
      if (status === ListStatus.PUBLISHED && (!item.itemName || item.itemName.trim() === "")) {
        throw new Error(`${index + 1}番目アイテム名必須`);
      }
    });
    // ★ map/filter の tagName に型注釈を追加 ★
    if (tags.some((tagName: string) => tagName.trim().length === 0 || tagName.length > 30)) {
      throw new Error("タグ名は1〜30文字");
    }
    if (tags.length > 5) throw new Error("タグは5個まで");
  } catch (error) {
    if (error instanceof z.ZodError) { return { error: error.errors.map((e) => e.message).join("\n"), success: false }; }
    if (error instanceof Error) { return { success: false, error: error.message }; }
    return { success: false, error: "入力内容の検証中にエラーが発生しました。" };
  }

  console.log(`[Action/createCompleteRanking] Attempt by user ${userDbId}, status: ${status}`);
  try {
    const newList = await prisma.$transaction(async (tx) => {
      // タグの処理 (Upsert & ID 取得)
      // ★ map/filter の tagName に型注釈 ★
      const tagConnectOrCreateData = tags
        .map((tagName: string) => tagName.trim())
        .filter((tagName: string) => tagName.length > 0)
        .map((tagName: string) => ({ where: { name: tagName }, create: { name: tagName } }));

      const upsertedTags = await Promise.all(
        // ★ map の data に型注釈 ★
        tagConnectOrCreateData.map((data: { where: { name: string }, create: { name: string } }) =>
          tx.tag.upsert({ where: data.where, create: data.create, update: {}, select: { id: true } })
        )
      );
      // ★ map の tag に型注釈 ★
      const tagIdsToConnect = upsertedTags.map((tag: { id: string }) => ({ id: tag.id }));

      // a. ランキングリストを作成
      const createdList = await tx.rankingList.create({
        data: {
          authorId: userDbId,
          subject: rankingData.subject.trim(),
          description: rankingData.description?.trim() || null,
          status: status,
          listImageUrl: rankingData.listImageUrl, // ★ listImageUrl を保存 ★
          displayOrder: null, // 新規作成時は null
          tags: {
            connect: tagIdsToConnect
          }
        },
      });
      // b. アイテムを作成 (もしあれば)
      if (itemsData.length > 0) {
        await tx.rankedItem.createMany({
          data: itemsData.map((item, index) => ({
            listId: createdList.id,
            rank: index + 1,
            itemName: item.itemName.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: item.imageUrl, // ★ imageUrl を保存 ★
          })),
        });
      }
      // c. 公開する場合は FeedItem も作成
      if (status === ListStatus.PUBLISHED) {
        await tx.feedItem.create({
          data: { userId: userDbId, type: FeedType.RANKING_UPDATE, rankingListId: createdList.id },
        });
        console.log(`FeedItem (RANKING_UPDATE) created for new list ${createdList.id}`);
      }
      return createdList; // 作成されたリスト情報を返す
    });

    console.log(`[Action/createCompleteRanking] Successfully created RankingList ${newList.id} with ${itemsData.length} items by user ${userDbId}`);

    // 4. キャッシュ再検証
    revalidatePath(`/rankings/${newList.id}`); // 作成されたリストの詳細ページ
    if (username) { revalidatePath(`/profile/${username}`); } // 作成者のプロフィール
    if (status === ListStatus.PUBLISHED) {
      revalidatePath("/"); // ホームタイムライン
      revalidatePath("/trends"); // トレンドページ (仮)
    }

    // 5. 成功結果を返す
    return { success: true, newListId: newList.id };

  } catch (error) {
    // 6. エラーハンドリング
    console.error("[Action/createCompleteRanking] Error creating complete ranking list:", error);
    const message = error instanceof Error ? error.message : "ランキングの作成中に予期せぬエラーが発生しました。";
    return { success: false, error: message };
  }
}


/**
 * [ACTION] 既存ランキングリストのアイテム、情報、ステータスを更新する (タグ・画像対応版)
 * @param listId 更新対象の RankingList ID
 * @param itemsData 更新後のアイテム配列 [{ id?, itemName, itemDescription?, imageUrl? }] ★ id を含むように変更推奨 ★
 * @param listSubject 更新後のタイトル
 * @param listDescription 更新後の説明
 * @param listImageUrl 更新後のヘッダー画像 URL (任意)
 * @param tags 更新後のタグ名の配列 (任意) ★ 追加 ★
 * @param targetStatus 更新後のステータス
 * @returns ActionResult
 */
export async function saveRankingListItemsAction(
  listId: string,
  itemsData: ItemDataForSave[],     // ★ itemsData の型には id? を含めたい ★
  listSubject: string,
  listDescription: string | null,
  listImageUrl: string | null | undefined,
  tags: string[],                   // ★ tags 引数を追加 ★
  targetStatus: ListStatus
): Promise<ActionResult> {
  // 1. 認証チェック & ユーザー情報取得
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };
  let userDbId: string | null = null;
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId }, select: { id: true } });
    if (!user?.id) { throw new Error("ユーザー情報が見つかりません。"); }
    userDbId = user.id;
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "ユーザー情報取得エラー" }; }

  // 2. 入力バリデーション
  try { SubjectSchema.parse(listSubject); DescriptionSchema.parse(listDescription ?? "");
    if (tags.some(tag => tag.trim().length === 0 || tag.length > 30)) throw new Error("タグ名は1文字以上30文字以内...");
    if (tags.length > 5) throw new Error("タグは5個まで...");
  }
  catch (error) { /* ... バリデーションエラー処理 ... */ }

  console.log(`[Action/saveRankingListItems] Saving list ${listId} by user ${userDbId}`);
  try {
    // 3. 編集権限チェック (リストが存在し、自分が作者であるか)
    const list = await prisma.rankingList.findUnique({ where: { id: listId, authorId: userDbId }, select: { id: true, status: true } });
    if (!list) { throw new Error("リストが見つからないか、編集権限がありません。"); }

    // 4. DB更新 (トランザクション)
    await prisma.$transaction(async (tx) => {
            // ★★★ タグの処理 (Upsert & ID 取得) ★★★
            const tagConnectOrCreateData = tags
            .map(tagName => tagName.trim())
            .filter(tagName => tagName.length > 0)
            .map((tagName: string) => ({ where: { name: tagName }, create: { name: tagName } }));
          const upsertedTags = await Promise.all(
              tagConnectOrCreateData.map(data => tx.tag.upsert({
                  where: data.where, create: data.create, update: {}, select: { id: true }
              }))
          );
          const tagIdsToSet = upsertedTags.map((tag: { id: string }) => ({ id: tag.id }));
          // a. 既存アイテムを全削除
      await tx.rankedItem.deleteMany({ where: { listId: listId } });
      // b. 新しいアイテムを作成 (imageUrl を含む)
      if (itemsData.length > 0) {
        await tx.rankedItem.createMany({
          data: itemsData.map((item, index) => ({
            listId: listId,
            rank: index + 1,
            itemName: item.itemName.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: item.imageUrl, // ★ imageUrl を保存 ★
          })),
        });
      }
      // c. ランキングリスト本体を更新 (listImageUrl を追加)
      await tx.rankingList.update({
        where: { id: listId, authorId: userDbId },
        data: {
          subject: listSubject.trim(),
          description: listDescription?.trim() || null,
          status: targetStatus,
          listImageUrl: listImageUrl, // ★ listImageUrl を更新 ★
          updatedAt: new Date(), // 更新日時を記録
          tags: {
            set: tagIdsToSet
          }
        },
      });
      // d. もし公開 (PUBLISHED) に変更された場合、FeedItem を作成 (または更新)
      if (targetStatus === ListStatus.PUBLISHED) {
         // 既に FeedItem が存在するか確認した方が良いかもしれない
         await tx.feedItem.upsert({ // ★ upsert で作成または更新 ★
           where: { rankingListId_type: { rankingListId: listId, type: FeedType.RANKING_UPDATE } }, // 複合ユニークインデックスがあれば使える
                                                                                                    // なければ findFirst + create/update
           create: { userId: userDbId, type: FeedType.RANKING_UPDATE, rankingListId: listId },
           update: { updatedAt: new Date() }, // 更新日時を更新
         });
         console.log(`FeedItem (RANKING_UPDATE) created/updated for list ${listId}`);
      } else if (targetStatus === ListStatus.DRAFT && list.status === ListStatus.PUBLISHED) {
          // もし公開から下書きに変更されたら、FeedItem を削除する？ (仕様による)
          // await tx.feedItem.deleteMany({ where: { rankingListId: listId, type: FeedType.RANKING_UPDATE } });
      }
    });

    console.log(`[Action/saveRankingListItems] Success: List ${listId} saved.`);
    // 5. キャッシュ再検証
    revalidatePath(`/rankings/${listId}/edit`);
    revalidatePath(`/rankings/${listId}`);
    // 関連する可能性のあるパスも再検証
    const listAuthor = await prisma.user.findUnique({ where: { id: userDbId }, select: { username: true } });
    if (listAuthor?.username) { revalidatePath(`/profile/${listAuthor.username}`); }
    if (targetStatus === ListStatus.PUBLISHED) { revalidatePath("/"); revalidatePath("/trends"); }

    return { success: true }; // 成功

  } catch (error) {
    console.error(`[Action/saveRankingListItems] Error saving ranking list ${listId}:`, error);
    const message = error instanceof Error ? error.message : "リストの保存中に予期せぬエラーが発生しました。";
    return { success: false, error: message };
  }
}

// ランキング削除アクション
export async function deleteRankingListAction(
  prevState: ActionResult | null,
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
    user = await prisma.user.findUnique({ where: { clerkId: clerkId }, select: { id: true, username: true } });
    if (!user) { throw new Error("データベースにユーザーが見つかりません。"); }
    const userDbId = user.id;
    // ★ 削除前に FeedItem も削除する (onDelete: SetNull のため) ★
    //    関連する Retweet や QuoteRetweet も考慮が必要か？ -> 複雑になるため一旦 FeedItem (RANKING_UPDATE) のみ
    await prisma.$transaction(async (tx) => {
      await tx.feedItem.deleteMany({ where: { rankingListId: listId, type: FeedType.RANKING_UPDATE }});
      const result = await tx.rankingList.deleteMany({ where: { id: listId, authorId: userDbId } });
      if (result.count === 0) { throw new Error("リストが見つからないか、削除権限がありません。"); }
    });
    console.log(`RankingList ${listId} deleted successfully by user ${userDbId}`);
    // キャッシュ再検証
    if (user.username) { revalidatePath(`/profile/${user.username}`); }
    revalidatePath("/"); revalidatePath("/trends"); revalidatePath(`/rankings/${listId}`);
    // return { success: true }; // redirect するので不要
  } catch (error) {     const message = error instanceof Error ? error.message : "削除中にエラー発生"; }
  // ★ redirect は try-catch の外が良い ★
  if (user?.username) { redirect(`/profile/${user.username}`); }
  else { redirect("/"); }
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
): Promise<PaginatedResponse<RankingListSnippet>> {
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

