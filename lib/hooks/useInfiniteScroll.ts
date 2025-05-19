// hooks/useInfiniteScroll.ts
"use client";

import { useEffect, useMemo, useRef, useCallback } from 'react';
import useSWRInfinite, { type SWRInfiniteKeyLoader, type SWRInfiniteConfiguration, type SWRInfiniteResponse } from 'swr/infinite';
import { useInView } from 'react-intersection-observer';
import type { PaginatedResponse, ActionResult } from '@/lib/types';
import type { MutatorCallback, MutatorOptions } from 'swr';
import type { BareFetcher } from 'swr';

// カスタムフックが返す値の型定義
// ★ mutate の型を SWRInfiniteResponse から取得するように変更 ★
export interface UseInfiniteScrollReturn<ItemType, Data extends PaginatedResponse<ItemType> = PaginatedResponse<ItemType>> {
  data: ItemType[];
  error: any;
  isLoadingInitialData: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  loadMoreRef: (node?: Element | null) => void;
  isValidating: boolean;
  size: number;
  setSize: SWRInfiniteResponse<Data>['setSize']; // ★ SWR の型を使用 ★
  mutate: SWRInfiniteResponse<Data>['mutate'];   // ★ SWR の型を使用 ★
}

/**
 * SWR を利用した無限スクロールのためのカスタムフック
 * @template Data - PaginatedResponse を継承したデータ型
 */
export function useInfiniteScroll<Data extends PaginatedResponse<any>>(
  getKey: SWRInfiniteKeyLoader,
  fetcher: BareFetcher<Data> | null,
  options?: SWRInfiniteConfiguration<Data, any>,
  threshold: number = 0.1
  // ★ 戻り値の ItemType を Data から抽出 ★
): UseInfiniteScrollReturn<Data['items'][number], Data> {

  // --- SWRInfinite フック呼び出し (変更なし) ---
  const {
    data: pages, error, size, setSize, isLoading, isValidating, mutate,
  } = useSWRInfinite<Data>(getKey, fetcher, { /* ...options... */ });

  // --- 派生状態の計算 ---
  const flattenedData = useMemo(() => pages?.flatMap(page => page.items) ?? [], [pages]);
  type ItemType = Data['items'][number];

  const isReachingEnd = useMemo(() => {
    return !getKey(size, pages?.[pages.length - 1] ?? null) ||
           (pages && pages.length > 0 && pages[pages.length - 1]?.items.length === 0);
  }, [size, pages, getKey]);

  const isLoadingInitialData = !pages && !error && isLoading;
  const isLoadingMore = useMemo(() => {
    return isLoading || (size > 0 && pages && typeof pages[size - 1] === 'undefined' && !isReachingEnd);
  }, [isLoading, size, pages, isReachingEnd]);

  const { ref: loadMoreRef, inView } = useInView({ threshold });
  useEffect(() => {
    if (inView && !isReachingEnd && !isLoadingMore && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, isReachingEnd, isLoadingMore, isValidating, size, setSize]);

  // --- フックが返す値 ---
  return {
    data: flattenedData as ItemType[],
    error,
    isLoadingInitialData,
    isLoadingMore: isLoadingMore ?? false,
    isReachingEnd: isReachingEnd ?? false,
    loadMoreRef,
    isValidating,
    size,
    setSize,
    mutate,
  };
}