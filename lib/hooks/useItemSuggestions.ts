// lib/hooks/useItemSuggestions.ts
import useSWR from "swr";
import { useDebounce } from "./useDebounce";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useItemSuggestions(
  subject: string,
  query: string
) {
  const debounced = useDebounce(query, 300);
  const shouldFetch = subject && debounced.length >= 1;
  const prefixParam = debounced
    ? `&prefix=${encodeURIComponent(debounced)}`
    : "";
  const key = shouldFetch
    ? `/api/suggestions/items?subject=${encodeURIComponent(
        subject
      )}${prefixParam}`
    : null;
  const { data, error, isLoading } = useSWR<string[]>(key, fetcher);
  return {
    options: data ?? [],
    isLoading,
    isError: !!error,
  };
}