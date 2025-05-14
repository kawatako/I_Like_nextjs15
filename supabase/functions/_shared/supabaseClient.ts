// supabase/functions/_shared/supabaseClient.ts
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// プロジェクト URL は既存の環境変数をそのまま使う
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// service role key で作成すれば、RLS を無効化した “管理者” 接続になる
export const sb = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, detectSessionInUrl: false },
});