// lib/utils/storage.ts
import { createClient } from "@supabase/supabase-js";

// Supabase 管理クライアント（署名付き URL 用）
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * publicUrl（または blob: URL）を受け取り、
 * 必要なら Supabase の署名付き URL に変換して返すユーティリティ。
 *
 * @param publicUrl - 公開 URL あるいは blob:... の場合はそのまま返す
 * @param bucket - Supabase バケット名 (デフォルト "i-like")
 * @param expiresIn - 有効期限（秒） (デフォルト 86400)
 */
export async function generateImageUrl(
  publicUrl?: string | null,
  bucket: string = "i-like",
  expiresIn: number = 60 * 60 * 24
): Promise<string | null> {
  if (!publicUrl || publicUrl.startsWith("blob:")) return publicUrl ?? null;
  try {
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) return publicUrl;  // 公開 URL ならそのまま
    const key = url.pathname.slice(prefix.length);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);
    if (error) {
      console.error("Signed URL 生成失敗:", error);
      return publicUrl;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("generateImageUrl error:", e);
    return publicUrl;
  }
}
