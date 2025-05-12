// components/KeepAlivePing.tsx
//クライアント側でも「ページを開いたら１回だけ」軽く 初回ロード時に
// /api/keep-alive を叩いてウォームアップして接続プールを常時アクティブに保つ


"use client";

import { useEffect } from "react";

export function KeepAlivePing() {
  useEffect(() => {
    // Same-origin からの呼び出しなので認証は不要
    fetch("/api/keep-alive").catch((e) => {
      console.error("Keep-alive ping failed:", e);
    });
  }, []);

  return null;
}
