// hooks/useImageUploader.ts
"use client";

import { useState, useCallback } from 'react';
// ★ createClient を @supabase/supabase-js から直接インポート ★
import { createClient } from '@supabase/supabase-js';
// ★ useUser と useSession をインポート ★
import { useUser, useSession } from "@clerk/nextjs";
import { useToast } from "@/components/hooks/use-toast";

const BUCKET_NAME = 'i-like'; // ★ バケット名を再確認 ★
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useImageUploader() {
  const { user } = useUser();
  const { session } = useSession(); // ★ useSession を使ってセッションを取得 ★
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    // 環境変数とユーザーセッションのチェック
    if (!supabaseUrl || !supabaseAnonKey) {
      const msg = "Supabase の設定が環境変数にありません。";
      setError(msg); toast({ title: "設定エラー", description: msg, variant: "destructive" });
      setIsLoading(false); return null;
    }
    if (!user?.id) { /* ... */ return null; }
    if (!session) { // ★ セッションが存在するかチェック ★
      const msg = "Clerk セッションが見つかりません。";
      setError(msg); toast({ title: "認証エラー", description: msg, variant: "destructive" });
      setIsLoading(false); return null;
    }
    if (!file) { /* ... */ return null; }
    if (!file.type.startsWith('image/')) { /* ... */ return null; }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `${timestamp}_${randomSuffix}.${fileExt}`;
    const filePath = `${user.id}/${uniqueFileName}`;

    try {
      // ★★★ Clerk セッションを使って Supabase クライアントを作成 ★★★
      console.log("Creating Supabase client with Clerk session token...");
      const supabaseAccessToken = await session.getToken({ template: "supabase" }); // ★ useSession から getToken ★
      if (!supabaseAccessToken) { throw new Error("Supabase アクセストークンを取得できませんでした。"); }

      // ★ createClient に accessToken を渡す (または global headers) ★
      //    ドキュメントの例に近いのは accessToken オプションだが、supabase-js v2 の推奨は headers かもしれない
      //    まずはドキュメント例に合わせて accessToken オプションを試す
      const supabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: { // global オプションを使う方が一般的かもしれない
            headers: { Authorization: `Bearer ${supabaseAccessToken}` }
          },
          // auth: { // このオプションは setSession を内部で呼ぶかもしれないので避ける方が安全か
          //   autoRefreshToken: false,
          //   persistSession: false,
          //   detectSessionInUrl: false
          // }
        }
      );
      console.log("Supabase client initialized for upload.");
      // ★★★ 以前の supabase.auth.setSession は削除 ★★★

      console.log(`Attempting to upload to Supabase Storage: ${filePath}`);
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) { throw uploadError; }
      console.log("Upload successful, data:", data);

      // 公開 URL を取得 (これは通常のクライアントでも可能)
      const { data: publicUrlData } = createClient(supabaseUrl, supabaseAnonKey).storage // 公開URL取得用に別クライアント作成
          .from(BUCKET_NAME)
          .getPublicUrl(data.path);

      if (!publicUrlData?.publicUrl) { throw new Error("Failed to get public URL"); }
      console.log("Public URL generated:", publicUrlData.publicUrl);

      setIsLoading(false);
      return publicUrlData.publicUrl;

    } catch (err) {
      console.error("Error uploading image:", err);
      const message = err instanceof Error ? err.message : "アップロード中に不明なエラーが発生しました。";
      setError(message);
      toast({ title: "アップロードエラー", description: message, variant: "destructive" });
      setIsLoading(false);
      return null;
    }
  // ★ 依存配列に session を追加 ★
  }, [user, toast, session]);

  return { uploadImage, isLoading, error };
}