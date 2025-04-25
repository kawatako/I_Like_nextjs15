// lib/actions/userActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { z } from "zod"; // Zod をインポート
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries"; // DB ID 取得関数
import type { ActionResult } from "@/lib/types"; // 共通の戻り値型

// --- 型定義 ---

// アクションが受け取るデータの型
export type ProfileUpdateData ={
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  birthday?: Date | string | null; // HTML date input は string を返すので string も許容
  socialLinks?: { // socialLinks はオブジェクトで受け取る想定
    x?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    website?: string | null;
  } | null;
  image?: string | null; // プロフィール画像 URL
  coverImageUrl?: string | null; // カバー画像 URL
}

// --- Zod バリデーションスキーマ定義 ---
const ProfileUpdateSchema = z.object({
  name: z.string().trim().max(30, "表示名は30文字以内で入力してください。").optional().nullable(),
  bio: z.string().trim().max(160, "自己紹介は160文字以内で入力してください。").optional().nullable(),
  location: z.string().trim().max(100, "場所は100文字以内で入力してください。").optional().nullable(), // 場所の文字数制限 (例)
  // 生年月日は Date オブジェクトに変換可能か、または単に string として受け取るか
  // HTML の date input は 'YYYY-MM-DD' 形式の文字列を返す
  birthday: z.string().nullable().optional().refine((date) => date === null || date === undefined || date === '' || !isNaN(Date.parse(date)), { message: "有効な日付を入力してください" })
    .transform((date) => (date ? new Date(date) : null)),
  socialLinks: z.object({
    x: z.string().url("有効なURLを入力してください。").optional().nullable().or(z.literal('')), // URL または空文字
    instagram: z.string().url("有効なURLを入力してください。").optional().nullable().or(z.literal('')),
    tiktok: z.string().url("有効なURLを入力してください。").optional().nullable().or(z.literal('')),
    website: z.string().url("有効なURLを入力してください。").optional().nullable().or(z.literal('')),
  }).optional().nullable(),
  image: z.string().url("有効な画像URLを入力してください。").optional().nullable(), // 画像URLの形式チェック
  coverImageUrl: z.string().url("有効なカバー画像URLを入力してください。").optional().nullable(),
}).strict(); // スキーマにないプロパティをエラーにする

// --- Server Action 本体 ---

/**
 * [ACTION] ログインユーザー自身のプロフィール情報を更新する
 * @param data 更新するプロフィールデータのオブジェクト
 * @returns ActionResult 成功または失敗情報
 */
export async function updateProfileAction(
  data: ProfileUpdateData
): Promise<ActionResult> {
  console.log("[Action/updateProfile] Received data:", data);

  // 1. 認証チェック & ユーザー DB ID 取得
  const authResult = await auth();
  const clerkId = authResult.userId;
  
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }
  
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) { return { success: false, error: "ユーザー情報が見つかりません。" }; }

  // 2. 入力データのバリデーションと整形 (Zod)
  const validationResult = ProfileUpdateSchema.safeParse(data);
  if (!validationResult.success) {
    // Zod のエラーメッセージを整形して返す
    const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    console.warn(`[Action/updateProfile] Validation failed for user ${userDbId}:`, errorMessages);
    return { success: false, error: `入力内容に誤りがあります: ${errorMessages}` };
  }
  // バリデーション済みのデータを取得 (transform 適用後)
  const validatedData = validationResult.data;
  // socialLinks が null や undefined でないことを確認し、Prisma が期待する Json 型に
  const socialLinksJson = validatedData.socialLinks ? Prisma.JsonNull : validatedData.socialLinks;
    // Prisma.JsonNull を使うか、単に null を渡すかは DB 設定によるかも？
    // ここでは validatedData.socialLinks (オブジェクト or null) をそのまま渡してみる

  console.log(`[Action/updateProfile] Updating profile for user ${userDbId}`);
  try {
    // ★★★ prisma.user.update に渡す data オブジェクトを事前に作成 ★★★
    const dataToUpdate: Prisma.UserUpdateInput = {
        name: validatedData.name,
        bio: validatedData.bio,
        location: validatedData.location,
        birthday: validatedData.birthday,
        image: validatedData.image,
        coverImageUrl: validatedData.coverImageUrl,
        updatedAt: new Date(),
        // socialLinks は undefined でない場合のみ追加
    };

    if (validatedData.socialLinks !== undefined) {
      dataToUpdate.socialLinks = validatedData.socialLinks === null
          ? Prisma.JsonNull // ★ null の場合は Prisma.JsonNull を使う ★
          : validatedData.socialLinks; // オブジェクトの場合はそのまま
  }

    const updatedUser = await prisma.user.update({
      where: { id: userDbId },
      data: dataToUpdate, // ★ 作成した data オブジェクトを渡す ★
      select: { username: true }
    });

    console.log(`[Action/updateProfile] Profile updated successfully for user ${userDbId}`);

    // 4. キャッシュ再検証
    if (updatedUser.username) {
      revalidatePath(`/profile/${updatedUser.username}`); // 自分のプロフィールページ
      revalidatePath(`/profile/${updatedUser.username}/edit`); // 編集ページも念のため
    }
    revalidatePath('/'); // タイムライン (ヘッダー部分など)

    return { success: true };

  } catch (error) {
    // 5. エラーハンドリング
    console.error(`[Action/updateProfile] Error updating profile for user ${userDbId}:`, error);
    // Prisma のエラーコードなどで詳細なエラー判別も可能
    const message = error instanceof Error ? error.message : "プロフィールの更新中にエラーが発生しました。";
    return { success: false, error: message };
  }
}