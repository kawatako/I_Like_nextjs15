// hooks/useTutorial.ts
//チュートリアルモーダル表示の起動フック
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "seenTutorial";

export function useTutorial() {
  // seen: 既読かどうか
  const [seen, setSeen] = useState<boolean>(true);
  // open: モーダル開閉状態
  const [open, setOpen] = useState<boolean>(false);

  // マウント時に localStorage をチェック → 未読なら自動オープン＋既読フラグを立てる
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(STORAGE_KEY);
    const hasSeen = v === "true";
    setSeen(hasSeen);

    if (!hasSeen) {
      // 初回／未読: 自動的に開いて即マーク既読
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, "true");
      setSeen(true);
    }
  }, []);

  const openTutorial = useCallback(() => {
    setOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setOpen(false);
  }, []);

  return { seen, open, openTutorial, closeTutorial };
}
