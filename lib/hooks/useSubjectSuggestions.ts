// lib/hooks/useSubjectSuggestions.ts
import useSWR from "swr";
import { useDebounce } from "./useDebounce";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useSubjectSuggestions(query: string) {
  const debounced = useDebounce(query, 300);
  const shouldFetch = debounced.length >= 3;
  const key = shouldFetch
    ? `/api/suggestions/subjects?prefix=${encodeURIComponent(debounced)}`
    : null;
  const { data, error, isLoading } = useSWR<string[]>(key, fetcher);
  return {
    options: data ?? [],
    isLoading,
    isError: !!error,
  };
}