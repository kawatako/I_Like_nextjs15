// lib/hooks/useItemSuggestions.ts

import useSWR from "swr";
import { useDebounce } from "./useDebounce";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useItemSuggestions(
  subject: string,
  query: string,
  enabled: boolean   // ← フェッチを起動させるフラグ
) {
  const debounced = useDebounce(query, 300);
  // prefix は空文字でも付与（空文字なら「全件取得」になればOK）
  const prefixParam = `&prefix=${encodeURIComponent(debounced)}`;
  const key =
    enabled && subject
      ? `/api/suggestions/items?subject=${encodeURIComponent(
          subject
        )}${prefixParam}`
      : undefined;
  const { data, error, isLoading } = useSWR<string[]>(key, fetcher);
  return {
    options: data ?? [],
    isLoading,
    isError: !!error,
  };
}
