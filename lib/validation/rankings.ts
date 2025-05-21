// lib/validation/rankings.ts
import { z, ZodError } from "zod";

// ─── ランキングのタイトル（subject）に使える文字と長さ ───

// ひらがな・カタカナ・漢字・英数字・半角スペースのみを１文字以上含む文字列
export const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9 ]+$/u;

export const SubjectSchema = z
  .string({ required_error: "を入力してください。", invalid_type_error: "タイトルを入力してください。" })
  .trim()
  .min(5, "タイトルは5文字以上で入力してください。")
  .max(30, "タイトルは30字以内です。")
  .regex(subjectAllowedCharsRegex, {
    message: "ひらがな・カタカナ・漢字・英数字・半角スペースのみを入力してください。",
  });

// ─── 説明フィールドの長さチェック ───

export const DescriptionSchema = z
  .string()
  .trim()
  .max(200, "タイトルの説明は200字以内です。")
  .nullable()
  .or(z.literal("")) // 空文字も許容
  .transform((v) => (v === "" ? null : v));

// ─── アイテム名・説明のスキーマ ───

export const ItemNameSchema = z
  .string()
  .trim()
  .min(1, "アイテム名は必須です。")
  .max(30, "アイテム名は30字以内です。");

export const ItemDescSchema = z
  .string()
  .trim()
  .max(200, "アイテムの説明は200字以内です。")
  .nullable()
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v));

// ─── タグ名のスキーマ ───

export const TagNameSchema = z
  .string()
  .trim()
  .min(1, "タグ名は1文字以上入力してください。")
  .max(20, "タグ名は20文字以内です。");

// ─── フォーム全体のバリデーションヘルパー ───

/**
 * @returns エラーメッセージ文字列 or null (成功時)
 */
export function validateRankingForm(
  subject: string,
  description: string,
  items: Array<{ itemName: string; itemDescription?: string | null }>,
  tags: string[]
): string | null {
  try {
    SubjectSchema.parse(subject);
    DescriptionSchema.parse(description);

    if (tags.length > 5) {
      throw new Error("タグは5個までです。");
    }
    tags.forEach((t) => TagNameSchema.parse(t));

    if (items.length === 0) {
      throw new Error("アイテムを1つ以上追加してください。");
    }
    items.forEach((it, i) => {
      ItemNameSchema.parse(it.itemName);
      ItemDescSchema.parse(it.itemDescription ?? null);
    });

    return null;
  } catch (e) {
    if (e instanceof ZodError) {
      // 最初のエラーだけ返す
      return e.errors[0]?.message ?? "入力値に誤りがあります。";
    }
    return (e as Error).message;
  }
}
