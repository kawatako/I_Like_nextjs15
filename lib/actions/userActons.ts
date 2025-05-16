// lib/actions/userActions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/client";
import { safeQuery } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import type { ActionResult } from "@/lib/types";
import { supabaseAdmin } from '@/lib/utils/storage'

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
      .refine((s) => !s || !isNaN(Date.parse(s)), "有効な日付を入力してください。")
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
    // path 文字列として許可
    image: z.string().optional().nullable(),
    coverImageUrl: z.string().optional().nullable(),
  })
  .strict();

/**
 * [ACTION] ログインユーザー自身のプロフィールを更新
 */
export async function updateProfileAction(
  data: ProfileUpdateData
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "ログインしてください。" };

  const userDbId = await getUserDbIdByClerkId(clerkId);
  if (!userDbId) return { success: false, error: "ユーザーが見つかりません。" };

  // ① 更新前のレコードを取得
  const prev = await prisma.user.findUnique({
    where: { id: userDbId },
    select: { image: true, coverImageUrl: true },
  });

  // 入力のバリデーション
  const parsed = ProfileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    const msgs = parsed.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { success: false, error: `入力内容に誤りがあります: ${msgs}` };
  }
  const valid = parsed.data;

  // ② 新しい値を含む updateData を組み立て
  const updateData: Record<string, unknown> = { /* ...name,bio...*/ };
  if (data.image !== undefined)       updateData.image = data.image;
  if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;

  // ③ DB を更新
  const updated = await safeQuery(() =>
    prisma.user.update({
      where: { id: userDbId },
      data: updateData,
      select: { username: true }
    })
  );

  // ④ 古いファイルを削除
  const bucket = "i-like";
  // プロフィール画像
  if (data.image !== undefined && prev?.image && prev.image !== data.image) {
    supabaseAdmin
      .storage
      .from(bucket)
      .remove([prev.image])
      .catch((e) => console.error("古いプロフィール画像削除失敗:", e));
  }
  // カバー画像
  if (data.coverImageUrl !== undefined && prev?.coverImageUrl && prev.coverImageUrl !== data.coverImageUrl) {
    supabaseAdmin
      .storage
      .from(bucket)
      .remove([prev.coverImageUrl])
      .catch((e) => console.error("古いカバー画像削除失敗:", e));
  }

  // ⑤ キャッシュ再検証
  revalidatePath(`/profile/${updated.username}`);
  revalidatePath(`/profile/${updated.username}/edit`);
  revalidatePath(`/`);

  return { success: true };
}