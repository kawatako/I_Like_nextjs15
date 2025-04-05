"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを修正
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Sentiment, Prisma } from "@prisma/client";
import type { ActionState } from "./types"; // 共通の型をインポート

// ランキングリストのテーマ(subject)に対する Zod スキーマ
const subjectAllowedCharsRegex = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "ランキングのテーマを入力してください。")
  .max(50, "テーマは50字以内で入力してください。")
  .regex(subjectAllowedCharsRegex, {
    message: "テーマには日本語、英数字、半角スペースのみ使用できます。記号や絵文字は使用できません。",
  });

// ===== RankingList 作成アクション =====
export async function createRankingListAction(
  prevState: ActionState, // ActionState を使用
  formData: FormData
): Promise<ActionState> { // ActionState を使用
  const { userId: clerkId } = auth();
  if (!clerkId) {
    console.warn("createRankingListAction: User is not authenticated.");
    return { success: false, error: "ログインしてください。" };
  }

  try {
    const sentimentInput = formData.get("sentiment") as string;
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string | null;

    let sentiment: Sentiment;
    if (sentimentInput === Sentiment.LIKE || sentimentInput === Sentiment.DISLIKE) {
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
      console.error(`createRankingListAction: User with clerkId ${clerkId} not found in DB.`);
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

    console.log(`RankingList created (ID: ${newList.id}) by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`);
    revalidatePath("/");

    return { success: true, newListId: newList.id }; // newListId を返す

  } catch (error) {
    console.error("Error creating ranking list:", error);
    if (error instanceof z.ZodError) {
      return { error: error.errors.map((e) => e.message).join("\n"), success: false };
    } else if (error instanceof Error) {
      return { success: false, error: error.message };
    } else {
      return { success: false, error: "ランキングリストの作成中に予期せぬエラーが発生しました。" };
    }
  }
}

// --- 今後、ランキングアイテムの追加・編集・削除などのアクションもここに追加 ---