"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを修正
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./types"; // 共通の型をインポート

// 投稿内容の Zod スキーマ
const PostTextSchema = z
  .string()
  .min(1, "ポスト内容を入力してください。")
  .max(140, "140字以内で入力してください。");

// --- 投稿作成アクション ---
export async function addPostAction(
  prevState: ActionState, // ActionState を使用
  formData: FormData
): Promise<ActionState> { // ActionState を使用
  try {
    const postText = PostTextSchema.parse(formData.get("post") as string);

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "ログインしてください。" };
    }

    // Clerk ID から内部的な User ID (CUID) を取得
     const user = await prisma.user.findUnique({
       where: { clerkId: clerkId },
       select: { id: true },
     });
     if (!user) {
       console.error(`addPostAction: User with clerkId ${clerkId} not found in DB.`);
       throw new Error("データベースにユーザーが見つかりません。");
     }
     const authorDbId = user.id; // DB の User.id

    await prisma.post.create({
      data: {
        authorId: authorDbId, // DB の User.id を使用
        content: postText,
      },
    });

    console.log(`Post created by user (DB ID: ${authorDbId}, Clerk ID: ${clerkId})`);
    revalidatePath("/");

    return { success: true }; // シンプルに success だけ返す (newListId は不要)
  } catch (error) {
     console.error("Error adding post:", error);
    if (error instanceof z.ZodError) {
      return { error: error.errors.map((e) => e.message).join("\n"), success: false };
    } else if (error instanceof Error) {
      return { success: false, error: error.message };
    } else {
      return { success: false, error: "投稿中に予期せぬエラーが発生しました。" };
    }
  }
}