// lib/actions/rankingActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを確認
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Sentiment, Prisma, ListStatus, FeedType } from "@prisma/client";
import type { ActionState } from "./types"; // 共通の型をインポート (パス確認)
import { redirect } from "next/navigation";
// ★ 修正: インポート元を rankingQueries に変更 & 型を追加 ★
import {
  getProfileRankingsPaginated,
  // ★ RankingSnippetForProfile は userQueries からインポートする想定 ★
  type PaginatedResponse, // ★ PaginatedResponse は rankingQueries で export した想定 ★
} from "@/lib/data/rankingQueries"; // ← パスを rankingQueries.ts に変更
// ★ RankingSnippetForProfile は userQueries からインポート ★
import { type RankingSnippetForProfile } from "@/lib/data/userQueries";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries"; // これは userQueries のまま

// ランキングリストのテーマ(subject)に対する Zod スキーマ
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "ランキングのテーマを入力してください。")
  .max(50, "テーマは50字以内で入力してください。")
  .regex(subjectAllowedCharsRegex, {
    message:
      "テーマには日本語、英数字、半角スペースのみ使用できます。記号や絵文字は使用できません。",
  });

// --- Action: 新しいランキングを作成 ---
export async function createRankingListAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    console.warn("createRankingListAction: User is not authenticated.");
    return { success: false, error: "ログインしてください。" };
  }

  try {
    const sentimentInput = formData.get("sentiment") as string;
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string | null;

    let sentiment: Sentiment;
    if (
      sentimentInput === Sentiment.LIKE ||
      sentimentInput === Sentiment.DISLIKE
    ) {
      sentiment = sentimentInput;
    } else {
      throw new Error("感情の選択が無効です。");
    }

    const validatedSubject = SubjectSchema.parse(subject);

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });
    if (!user) {
      console.error(
        `createRankingListAction: User with clerkId ${clerkId} not found in DB.`
      );
      throw new Error("データベースにユーザーが見つかりません。");
    }
    const authorDbId = user.id;

    const newList = await prisma.rankingList.create({
      data: {
        sentiment: sentiment,
        subject: validatedSubject,
        description: description,
        authorId: authorDbId,
        status: ListStatus.DRAFT,
      },
    });

    console.log(
      `RankingList created (ID: ${newList.id}) by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`
    );
    revalidatePath("/");

    return { success: true, newListId: newList.id };
  } catch (error) {
    console.error("Error creating ranking list:", error);
    let returnState: ActionState;
    if (error instanceof z.ZodError) {
      returnState = {
        error: error.errors.map((e) => e.message).join("\n"),
        success: false,
      };
    } else if (error instanceof Error) {
      returnState = { success: false, error: error.message };
    } else {
      returnState = {
        success: false,
        error: "ランキングリストの作成中に予期せぬエラーが発生しました。",
      };
    }
    return returnState;
  }
}

// --- Action: ランキング全体を保存（更新） ---

interface ItemDataForSave {
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
}
type SaveActionState = { error?: string; success: boolean };

export async function saveRankingListItemsAction(
  listId: string,
  itemsData: ItemDataForSave[],
  listSubject: string,
  listDescription: string | null,
  targetStatus: ListStatus
): Promise<SaveActionState> {
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
    let returnState: SaveActionState;
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

// --- Action: ランキングを削除 ---

type DeleteActionState = { error?: string; success: boolean };

export async function deleteRankingListAction(
  prevState: DeleteActionState,
  formData: FormData
): Promise<DeleteActionState> {
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
      `Username not found for redirect after deleting list ${listId}. Redirecting to home.`
    );
    redirect("/");
  }
}

// --- ★★★ 無限スクロール用アクション ★★★ ---

// 無限スクロールで一度に読み込む件数
const PROFILE_RANKING_LIMIT = 10; // プロフィール画面での1ページの件数 (必要に応じて調整)

/**
 * プロフィールページのランキングリスト追加データを取得する Server Action
 * @param targetUserId 対象ユーザーの DB ID
 * @param status 取得するリストのステータス (PUBLISHED or DRAFT)
 * @param cursor 前のページの最後のリストの ID
 * @returns PaginatedResponse<RankingSnippetForProfile>
 */
export async function loadMoreProfileRankingsAction(
  targetUserId: string,
  status: ListStatus,
  cursor: string | null
): Promise<PaginatedResponse<RankingSnippetForProfile>> {
  // 認証チェック (オプション - 下書き取得時など)
  // const { userId: clerkId } = auth();
  // if (status === ListStatus.DRAFT) {
  //   const loggedInUserDbId = await getUserDbIdByClerkId(clerkId);
  //   if (!loggedInUserDbId || loggedInUserDbId !== targetUserId) {
  //     console.warn("[loadMoreProfileRankingsAction] Permission denied for draft lists.");
  //     return { items: [], nextCursor: null };
  //   }
  // }

  console.log(
    `[Action/loadMoreProfileRankings] Loading ${status} for ${targetUserId}, cursor: ${cursor}`
  );

  if (!targetUserId || !status) {
    console.error(
      "[Action/loadMoreProfileRankings] Missing targetUserId or status"
    );
    return { items: [], nextCursor: null };
  }

  try {
    // データ取得関数を呼び出す
    const result = await getProfileRankingsPaginated({
      userId: targetUserId,
      status: status,
      limit: PROFILE_RANKING_LIMIT,
      cursor: cursor ?? undefined,
    });
    return result; // 結果をそのまま返す
  } catch (error) {
    console.error(
      "[Action/loadMoreProfileRankings] Error fetching more rankings:",
      error
    );
    return { items: [], nextCursor: null }; // エラー時は空の結果
  }
}
