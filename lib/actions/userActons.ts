"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "../client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./types"; // 共通の型をインポート

// バリデーションスキーマ
const nameSchema = z.string().max(50, "表示名は50字以内です。").optional();
const bioSchema = z.string().max(160, "自己紹介は160字以内です。").optional();
const urlSchema = z.string().url("有効なURLを入力してください。").optional().or(z.literal(''));

// プロフィール詳細更新アクション
export async function updateUserProfileDetailsAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  try {
    // フォームデータを取得
    const name = formData.get("name") as string | null;
    const bio = formData.get("bio") as string | null;
    const coverImageUrl = formData.get("coverImageUrl") as string | null;
    // SNSリンクの例 (フォームの input name に合わせる)
    const twitterUrl = formData.get("twitterUrl") as string | null;
    const githubUrl = formData.get("githubUrl") as string | null;
    const websiteUrl = formData.get("websiteUrl") as string | null;

    // バリデーション
    const validatedName = name ? nameSchema.parse(name) : null;
    const validatedBio = bio ? bioSchema.parse(bio) : null;
    const validatedCoverImageUrl = coverImageUrl ? urlSchema.parse(coverImageUrl) : null;
    const validatedTwitterUrl = twitterUrl ? urlSchema.parse(twitterUrl) : null;
    const validatedGithubUrl = githubUrl ? urlSchema.parse(githubUrl) : null;
    const validatedWebsiteUrl = websiteUrl ? urlSchema.parse(websiteUrl) : null;

    // SNSリンクを JSON オブジェクトにまとめる (例)
    const socialLinksData = {
      x: validatedTwitterUrl || undefined, // 値がなければ undefined
      instagram: validatedGithubUrl || undefined,
      website: validatedWebsiteUrl || undefined,
    };
    // 値が存在するものだけを含むようにフィルタリングも可能
    // const filteredSocialLinks = Object.fromEntries(Object.entries(socialLinksData).filter(([_, v]) => v != null));

    // データベースを更新
    const updatedUser = await prisma.user.update({
      where: { clerkId: clerkId },
      data: {
        name: validatedName,
        bio: validatedBio,
        coverImageUrl: validatedCoverImageUrl || undefined, // Zod が空文字を返す可能性を考慮
        // Prisma.JsonNull は使わず、値がなければ undefined を渡すことで更新しない or null にする（スキーマ定義による）
        socialLinks: socialLinksData, // JSON オブジェクトをそのまま渡す (Json? 型なので可能)
        // socialLinks: filteredSocialLinks // 値があるものだけにする場合
      },
       select: { username: true } // revalidatePath で使う username を取得
    });

     if (!updatedUser.username) {
       throw new Error("ユーザー名が見つかりません。");
     }

    console.log(`User profile details updated for clerkId: ${clerkId}`);

    // キャッシュ再検証
    revalidatePath(`/profile/${updatedUser.username}`); // プロフィールページを再検証
    revalidatePath(`/settings/profile`); // 設定ページも再検証

    return { success: true };

  } catch (error) {
    console.error("Error updating user profile details:", error);
    if (error instanceof z.ZodError) {
      return { error: error.errors.map((e) => e.message).join("\n"), success: false };
    } else if (error instanceof Error) {
      return { success: false, error: error.message };
    } else {
      return { success: false, error: "プロフィールの更新中に予期せぬエラーが発生しました。" };
    }
  }
}