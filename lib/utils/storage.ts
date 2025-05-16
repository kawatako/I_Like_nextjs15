//lib/utils/storage.ts
import { createClient } from "@supabase/supabase-js";

// Supabase 管理クライアント
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * パス文字列またはフルURLから署名付きURLを生成
 * @param pathOrUrl - ストレージパス（例: "user_xxx/filename.jpg"）または既にフルURL
 * @param bucket - Supabase Storageのバケット名
 * @param expiresIn - 署名付きURLの有効期限（秒）
 * @returns 署名付きURLまたは入力URL（エラー時はnull）
 */
export async function generateImageUrl(
  pathOrUrl?: string | null,
  bucket: string = "i-like",
  expiresIn: number = 60 * 60 * 24
): Promise<string | null> {
  if (!pathOrUrl) return null;
  // blob: や data: スキームはそのまま返す
  if (pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  try {
    // すでにフルURLならそのまま返す
    if (/^https?:\/\//.test(pathOrUrl)) {
      return pathOrUrl;
    }
    // ストレージパスとして署名付きURLを生成
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(pathOrUrl, expiresIn);
    if (error || !data) {
      console.error("generateImageUrl error:", error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("generateImageUrl exception:", e);
    return null;
  }
}
