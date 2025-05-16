// lib/actions/userActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import type { ActionResult } from "@/lib/types";

// --- 受け取るデータの型 ---
export type ProfileUpdateData = {
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  birthday?: string | Date | null;
  socialLinks?:
    | {
        x?: string | null;
        instagram?: string | null;
        tiktok?: string | null;
        website?: string | null;
      }
    | null;
  image?: string | null;
  coverImageUrl?: string | null;
};

// --- バリデーションスキーマ ---
// 受け取ったプロファイル更新データを検証／変換
const ProfileUpdateSchema = z
  .object({
    name: z.string().trim().max(30).optional().nullable(),
    bio: z.string().trim().max(160).optional().nullable(),
    location: z.string().trim().max(100).optional().nullable(),
    birthday: z
      .string()
      .optional()
      .nullable()
      .refine((s) => !s || !isNaN(Date.parse(s)), "有効な日付を入力してください")
      .transform((s) => (s ? new Date(s) : null)),
    socialLinks: z
      .object({
        x: z.string().url().optional().nullable().or(z.literal("")),
        instagram: z.string().url().optional().nullable().or(z.literal("")),
        tiktok: z.string().url().optional().nullable().or(z.literal("")),
        website: z.string().url().optional().nullable().or(z.literal("")),
      })
      .optional()
      .nullable(),
    image: z.string().url().optional().nullable(),
    coverImageUrl: z.string().url().optional().nullable(),
  })
  .strict();

/**
 * [ACTION] ログインユーザー自身のプロフィールを更新
 */
export async function updateProfileAction(
  data: ProfileUpdateData
): Promise<ActionResult> {
  // 1. 認証チェック
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "ログインしてください。" };
  }

  // 2. DB のユーザー ID を取得
  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) {
    return { success: false, error: "ユーザー情報が見つかりません。" };
  }

  // 3. 入力のバリデーション
  const parsed = ProfileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    const msgs = parsed.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { success: false, error: `入力内容に誤りがあります: ${msgs}` };
  }
  const valid = parsed.data;

  // 4. 更新用オブジェクトを組み立て
  const updateData: Record<string, unknown> = {
    name: valid.name,
    bio: valid.bio,
    location: valid.location,
    birthday: valid.birthday,
    image: valid.image,
    coverImageUrl: valid.coverImageUrl,
  };
  // socialLinks は undefined（変更しない）/null（リセット）/オブジェクト のいずれか
  if (valid.socialLinks !== undefined) {
    updateData.socialLinks = valid.socialLinks;
  }

  // 5. DB 更新＆キャッシュ再検証
  try {
    const updated = await safeQuery(() =>
      prisma.user.update({
        where: { id: userDbId },
        data: updateData,
        select: { username: true },
      })
    );

    // 自分のプロフィール周りを再検証
    revalidatePath(`/profile/${updated.username}`);
    revalidatePath(`/profile/${updated.username}/edit`);
    revalidatePath(`/`);

    return { success: true };
  } catch (error: any) {
    console.error("[updateProfileAction] error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "プロフィールの更新中にエラーが発生しました",
    };
  }
}
