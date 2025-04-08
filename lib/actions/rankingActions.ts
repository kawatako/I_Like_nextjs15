"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを修正
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Sentiment, Prisma, ListStatus } from "@prisma/client";
import type { ActionState } from "./types"; // 共通の型をインポート
import { redirect } from 'next/navigation'; // redirect をインポート

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

// 新しいランキングのタイトルや枠組みをデータベースに作成するためのサーバーアクション
export async function createRankingListAction(
  prevState: ActionState, // ActionState を使用
  formData: FormData
): Promise<ActionState> {
  // ActionState を使用
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
      },
    });

    console.log(
      `RankingList created (ID: ${newList.id}) by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`
    );
    revalidatePath("/");

    return { success: true, newListId: newList.id }; // newListId を返す
  } catch (error) {
    console.error("Error creating ranking list:", error);
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => e.message).join("\n"),
        success: false,
      };
    } else if (error instanceof Error) {
      return { success: false, error: error.message };
    } else {
      return {
        success: false,
        error: "ランキングリストの作成中に予期せぬエラーが発生しました。",
      };
    }
  }
}

// ランキングのタイトルの編集だけでなく、アイテム名や順位の追加・編集・並び替えといったリストの中身全体の編集を行うための元データを提供するサーバーアクション
export async function getRankingListForEdit(listId: string) {
  // 関数が呼び出されたことをログに出力 (デバッグ用)
  console.log(`getRankingListForEdit called for listId: ${listId}`);

  // 1. 現在のユーザーの Clerk ID を取得
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    // ログインしていない場合は null を返す (またはエラーを投げる)
    console.warn("getRankingListForEdit: User not authenticated.");
    return null;
  }

  try {
    // 2. 現在のユーザーの内部 DB ID を取得
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true }, // id のみ取得
    });
    if (!currentUser) {
      // DB にユーザーが存在しない場合 (通常は考えにくい)
      console.warn(
        `getRankingListForEdit: User with clerkId ${clerkId} not found in DB.`
      );
      return null;
    }
    const userDbId = currentUser.id;
    console.log(`getRankingListForEdit: Authenticated user DB ID: ${userDbId}`);

    // 3. リストID と 作成者ID (DBのID) が一致するリストを取得
    const rankingList = await prisma.rankingList.findUnique({
      where: {
        id: listId, // URL パラメータから渡されたリストID
        authorId: userDbId, // ★ 現在ログインしているユーザーが作成したリストか確認
      },
      // 関連するアイテムも一緒に取得 (rank 昇順で)
      include: {
        items: {
          orderBy: {
            rank: "asc",
          },
        },
      },
    });

    // 4. 結果を返す
    if (!rankingList) {
      // リストが見つからない、または自分が作成したリストではない場合
      console.log(
        `getRankingListForEdit: RankingList with id ${listId} not found or user ${userDbId} is not the author.`
      );
      return null;
    }

    // 見つかった場合
    console.log(
      `getRankingListForEdit: Successfully fetched list ${listId} with ${rankingList.items.length} items for user ${userDbId}`
    );
    return rankingList; // RankingList と items を含むオブジェクトを返す
  } catch (error) {
    // データベースエラーなどが発生した場合
    console.error(
      `getRankingListForEdit: Error fetching list ${listId}:`,
      error
    );
    return null; // エラー時も null を返す (ページ側で notFound() を呼ぶなどを想定)
  }
}

// フロントエンドから渡されるアイテムデータの型 (クライアントの状態に対応)
interface ItemDataForSave {
  // id はクライアント側での識別に使うかもしれないが、DB保存時には不要 (全削除＆再作成のため)
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
  // rank は配列の順序から決定
}

// 一括保存アクション用の State 型 (エラーメッセージのみ返す例)
type SaveActionState = {
  error?: string;
  success: boolean;
}

// ランキングリストのアイテム全体とリスト情報を保存するアクション
export async function saveRankingListItemsAction(
  listId: string,                 // 対象リストのID
  itemsData: ItemDataForSave[],   // クライアントから送られてくる現在のアイテム配列
  listSubject: string,            // 更新後のリスト主題
  listDescription: string | null, // 更新後のリスト説明
  targetStatus: ListStatus        // 保存後のステータス ('DRAFT' or 'PUBLISHED')
): Promise<SaveActionState> {     // 戻り値の型

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  // --- バリデーション ---
  try {
    SubjectSchema.parse(listSubject); // リスト主題のバリデーション
    if (itemsData.length > 10) { // アイテム数の上限チェック
      throw new Error("アイテムは10個までしか登録できません。");
    }
    // アイテム配列内の各アイテムのバリデーション (ここでは itemName の空チェックのみ)
    itemsData.forEach((item, index) => {
      if (!item.itemName || item.itemName.trim() === '') {
        throw new Error(`${index + 1}番目のアイテム名が入力されていません。`);
      }
      // 必要ならここで description や imageUrl のバリデーションも追加
      // 例: if (item.imageUrl && !z.string().url().safeParse(item.imageUrl).success) { ... }
    });
  } catch (error) {
     if (error instanceof z.ZodError) { return { error: error.errors.map((e) => e.message).join("\n"), success: false }; }
     if (error instanceof Error) { return { success: false, error: error.message }; }
     return { success: false, error: "入力内容の検証中にエラーが発生しました。" };
  }
  // --- バリデーションここまで ---

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId }, select: { id: true } });
    if (!user) { throw new Error("データベースにユーザーが見つかりません。"); }
    const userDbId = user.id;

    // リストの存在と所有権を確認 (更新時にも行う)
    const list = await prisma.rankingList.findUnique({ where: { id: listId, authorId: userDbId }, select: { id: true } });
    if (!list) { throw new Error("リストが見つからないか、編集権限がありません。"); }

    // --- トランザクション内で更新 ---
    await prisma.$transaction(async (tx) => {
      // 1. 既存のアイテムをすべて削除
      await tx.rankedItem.deleteMany({
        where: { listId: listId },
      });

      // 2. 新しいアイテム配列でアイテムを作成 (もし配列が空でなければ)
      if (itemsData.length > 0) {
        await tx.rankedItem.createMany({
          data: itemsData.map((item, index) => ({
            listId: listId,
            itemName: item.itemName.trim(),
            rank: index + 1, // 配列の順序からランクを決定
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: item.imageUrl?.trim() || null, // 画像URLも保存 (今はnullのはず)
          })),
        });
      }

      // 3. RankingList 自体の情報（subject, description, status）を更新
      await tx.rankingList.update({
        where: { id: listId, authorId: userDbId },
        data: {
          subject: listSubject.trim(),
          description: listDescription?.trim() || null,
          status: targetStatus, // 引数で受け取ったステータスを設定
          updatedAt: new Date(),
        },
      });
    });
    // --- トランザクションここまで ---

    console.log(`RankingList ${listId} and its items saved with status ${targetStatus}`);

    // キャッシュ再検証
    revalidatePath(`/rankings/${listId}/edit`);
    if (targetStatus === ListStatus.PUBLISHED) {
        const listAuthor = await prisma.user.findUnique({ where: {id: userDbId}, select: { username: true }});
        if (listAuthor?.username) {
            revalidatePath(`/profile/${listAuthor.username}`); // 公開されたらプロフィールも更新
        }
        revalidatePath('/'); // 公開されたらタイムラインも影響する可能性
    }


    return { success: true };

  } catch (error) {
    console.error(`Error saving ranking list ${listId}:`, error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    } else {
      return { success: false, error: "リストの保存中に予期せぬエラーが発生しました。" };
    }
  }
}

// 削除アクション用の State 型 (エラーメッセージのみ返す例)
type DeleteActionState = {
  error?: string;
  success: boolean;
}

export async function deleteRankingListAction(
  prevState: DeleteActionState, // prevState を追加
  formData: FormData
): Promise<DeleteActionState> { // 戻り値の型
  const { userId: clerkId } = await auth(); // ★ await を追加 ★
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  const listId = formData.get("listId") as string;
  if (!listId) {
    return { success: false, error: "リストIDが指定されていません。" };
  }

  // ★ user 変数を try の外で宣言 (redirect で使うため) ★
  let user: { id: string; username: string | null; } | null = null;

  try {
    // ★ user 変数に結果を代入 ★ (select に username が含まれていることを確認)
    user = await prisma.user.findUnique({
        where: { clerkId: clerkId },
        select: { id: true, username: true } // username が必要
    });
    if (!user) { throw new Error("データベースにユーザーが見つかりません。"); }
    const userDbId = user.id;

    const result = await prisma.rankingList.deleteMany({
      where: { id: listId, authorId: userDbId },
    });

    if (result.count === 0) {
      throw new Error("リストが見つからないか、削除権限がありません。");
    }

    console.log(`RankingList ${listId} deleted successfully by user ${userDbId}`);

    // キャッシュ再検証 (try ブロックの中でOK)
    if (user.username) {
        revalidatePath(`/profile/${user.username}`);
    }
    revalidatePath('/');

  } catch (error) {
    console.error(`Error deleting ranking list ${listId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "リストの削除中に予期せぬエラーが発生しました。";
    return { success: false, error: errorMessage }; // ★ エラー時はエラー状態を返す ★
  }

  // ★ 削除成功時は try ブロックの外（エラーがなければここまで到達）でリダイレクト ★
  if (user?.username) {
    redirect(`/profile/${user.username}`); // ★ 取得済みの user.username を使う ★
  } else {
    // username が不明な場合のフォールバック (通常は起こらないはず)
    console.warn(`Username not found for redirect after deleting list ${listId}. Redirecting to home.`);
    redirect('/');
  }
  // redirect はエラーを投げるので、この後の return は不要
}