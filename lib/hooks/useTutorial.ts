// hooks/useTutorial.ts
//チュートリアルの既読管理フック

import { useState, useEffect, useCallback } from "react";

//ローカルストレージに保存する際のキー名。
const STORAGE_KEY = "seenTutorial";

export function useTutorial() {
  //seen: チュートリアルを「既に見たか」を表す真偽値
  //初期値を true にしている のは、サーバーサイドで実行される場合（window がない環境）に安全に置くため。
  const [seen, setSeen] = useState<boolean>(true);
  //サーバー上では window が undefined なので、localStorage.getItem を呼ぶ前に必ずチェックする
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(STORAGE_KEY);
    setSeen(v === "true");
  }, []);

  const markAsSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, "true");
    setSeen(true);
  }, []);
  //seen（既読フラグ） markAsSeen()（既読にする関数）
  return { seen, markAsSeen };
}
