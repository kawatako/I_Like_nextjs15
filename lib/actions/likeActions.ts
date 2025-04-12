"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client"; // パスを修正
import { revalidatePath } from "next/cache";

// likeAction 用の戻り値型 (エラーまたは成功)
type LikeActionResult = {
  success: boolean;
  error?: string;
};

// --- いいねアクション ---
export const likeAction = async (
  formData: FormData
): Promise<LikeActionResult> => {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  const postId = formData.get("postId") as string;
  if (!postId) {
    return { success: false, error: "投稿IDが指定されていません。" };
  }

  try {
    // Clerk ID から内部的な User ID (CUID) を取得
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });
    if (!user) {
      console.error(
        `likeAction: User with clerkId ${clerkId} not found in DB.`
      );
      throw new Error("データベースにユーザーが見つかりません。");
    }
    const userDbId = user.id; // DB の User.id

    // 既存のいいねを検索
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: userDbId, // DB の User.id を使用
          postId: postId,
        },
      },
    });

    if (existingLike) {
      // いいね削除
      await prisma.like.delete({
        where: { userId_postId: { userId: userDbId, postId: postId } },
      });
      console.log(
        `Like removed by user (DB ID: ${userDbId}) for post ${postId}`
      );
    } else {
      // いいね作成
      await prisma.like.create({
        data: { postId: postId, userId: userDbId }, // DB の User.id を使用
      });
      console.log(`Like added by user (DB ID: ${userDbId}) for post ${postId}`);
    }

    revalidatePath("/"); // または関連パス、タグを再検証

    return { success: true };
  } catch (err) {
    console.error("Error in likeAction:", err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : "いいねの処理中にエラーが発生しました。";
    return { success: false, error: errorMessage };
  }
};
