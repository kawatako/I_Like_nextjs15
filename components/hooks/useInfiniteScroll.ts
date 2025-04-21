// hooks/useInfiniteScroll.ts
"use client"; // このフックはクライアントコンポーネントで使われるため

import { useEffect, useMemo, useRef } from "react";
import useSWRInfinite, { type SWRInfiniteKeyLoader } from "swr/infinite";
import { useInView } from "react-intersection-observer";
import type { PaginatedResponse, ActionResult } from "@/lib/types"; // 共通の型をインポート
import type { SWRInfiniteConfiguration } from "swr/infinite"; // SWRInfinite のオプション型

// --- カスタムフックの定義 ---

// データ取得関数の型定義 (Server Action など)
// キーを受け取り、ページネーションされたデータを返す関数
type InfiniteFetcher<Data extends PaginatedResponse<any>> = (
  key: any
) => Promise<Data>;

// useSWRInfinite に渡すオプションの型 (必要に応じて拡張)
// fallbackData を使えるように Partial でラップ
type InfiniteScrollOptions<Data extends PaginatedResponse<any>> = Partial<
  SWRInfiniteConfiguration<Data>
>;

/**
 * SWR を利用した無限スクロールのためのカスタムフック
 * @template Data - PaginatedResponse を継承したデータ型 (例: PaginatedResponse<FeedItemWithRelations>)
 * @param getKey - SWRInfinite のキー生成関数 (ページごとにキーを返す)
 * @param fetcher - データ取得関数 (Server Action など)
 * @param options - SWRInfinite に渡すオプション (fallbackData など)
 * @param threshold - Intersection Observer の閾値 (デフォルト: 0.1)
 * @returns 無限スクロールに必要な状態と関数
 */
export function useInfiniteScroll<Data extends PaginatedResponse<any>>(
  getKey: SWRInfiniteKeyLoader, // (index, previousPageData) => key | null
  fetcher: InfiniteFetcher<Data>,
  options?: InfiniteScrollOptions<Data>,
  threshold: number = 0.1 // Intersection Observer の閾値
) {
  // SWRInfinite フックでデータを取得・管理
  const {
    data: pages, // 取得した全ページデータの配列 (Data[])
    error,
    size, // 現在のページ数
    setSize, // ページ数を変更する関数
    isLoading, // 初回ロード中 or size 変更直後のロード中
    isValidating, // 再検証中
    mutate, // キャッシュ更新関数
  } = useSWRInfinite<Data>(getKey, fetcher, {
    revalidateFirstPage: false, // fallbackData があれば初回再検証しない
    ...options, // 外部から渡されたオプションを適用
    // ★★★ 前回の問題解決のため、自動再検証をデフォルトでオフにする設定を追加 ★★★
    revalidateOnFocus: options?.revalidateOnFocus ?? false,
    revalidateOnReconnect: options?.revalidateOnReconnect ?? false,
    revalidateIfStale: options?.revalidateIfStale ?? false,
  });

  // 全ページの items を一つの配列にフラット化 (useMemo で計算結果をメモ化)
  const flattenedData = useMemo(
    () => pages?.flatMap((page) => page.items) ?? [],
    [pages]
  );

  // 次のページがあるかどうか (最後のページの nextCursor が null でないか)
  const isReachingEnd = useMemo(() => {
    if (!pages || pages.length === 0) return false; // データがなければ終端ではない
    return pages[pages.length - 1]?.nextCursor === null;
  }, [pages]);

  // もっと読み込む必要があるか (終端ではなく、現在読み込み中でもない)
  const hasMore = !isReachingEnd;

  // UI が表示すべき「ローディング中」状態 (初回 or 追加読み込み)
  const isLoadingMore = useMemo(() => {
    return (
      isLoading ||
      (size > 0 && pages && typeof pages[size - 1] === "undefined" && hasMore)
    );
  }, [isLoading, size, pages, hasMore]);

  // 無限スクロールトリガー用の Intersection Observer
  const { ref: loadMoreRef, inView } = useInView({ threshold });

  // inView が true になり、条件を満たせば次のページを読み込む
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, hasMore, isLoadingMore, isValidating, size, setSize]);

  // フックが返す値
  return {
    data: flattenedData, // 表示用のフラット化されたデータ配列
    pages, // (デバッグ用) SWR が返す生のページデータ配列
    error, // データ取得エラー
    isLoadingMore, // ローディング中か (UI表示用)
    isReachingEnd, // 終端に達したか (UI表示用)
    isValidating, // 再検証中か (UI表示用)
    loadMoreRef, // リスト末尾の要素に設定する ref
    size, // 現在のページ数
    setSize, // ページ数を変更する関数 (手動ロード等)
    mutate, // キャッシュを更新する関数 (いいね等で使用)
  };
}
