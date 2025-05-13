import { createClient } from "@supabase/supabase-js";

// Supabase 管理クライアント
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateImageUrl(
  publicUrl?: string | null,
  bucket: string = "i-like",
  expiresIn: number = 60 * 60 * 24
): Promise<string | null> {
  if (!publicUrl || publicUrl.startsWith("blob:")) return publicUrl ?? null;
  try {
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) {
      // publicUrl が別ホストや署名済みならそのまま返す
      return publicUrl;
    }
    const key = url.pathname.slice(prefix.length);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);
    return error ? publicUrl : data.signedUrl;
  } catch (e) {
    console.error("generateImageUrl error:", e);
    return publicUrl;
  }
}
