// components/component/search/SearchPageClient.tsx
"use client";

import { useState, useCallback } from "react";
import type { PaginatedResponse, RankingListSnippet } from "@/lib/types";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll";
import { searchRankingListsAction } from "@/lib/actions/searchActions";
import SearchTabs from "@/components/component/search/SearchTabs";
import SearchSortTabs from "@/components/component/search/SearchSortTabs";
import SearchResultList from "@/components/component/search/SearchResultList";

interface Props {
  initialData: PaginatedResponse<RankingListSnippet>;
  query: string;
  initialTab: "title" | "item" | "tag";
  initialSort: "count" | "new" | "like";
}

type SearchKey = readonly [
  "search",
  string,
  "title" | "item" | "tag",
  "count" | "new" | "like",
  string?
];

export default function SearchPageClient({
  initialData,
  query,
  initialTab,
  initialSort,
}: Props) {
  const [tab, setTab] = useState(initialTab);
  const [sort, setSort] = useState(initialSort);

  // SWR Infinite のキー生成
  const getKey = useCallback(
    (pageIndex: number, prev: PaginatedResponse<RankingListSnippet> | null) => {
      if (pageIndex === 0) {
        return ["search", query, tab, sort, undefined] as SearchKey;
      }
      if (!prev?.nextCursor) return null;
      return ["search", query, tab, sort, prev.nextCursor] as SearchKey;
    },
    [query, tab, sort]
  );

  // フェッチャー：引数に型を注釈
  const fetcher = useCallback(
    ([, q, t, s, cursor]: SearchKey) =>
      searchRankingListsAction(q, t, s, cursor),
    []
  );

  const {
    data: lists,
    isLoadingInitialData,
    isLoadingMore,
    isReachingEnd,
    loadMoreRef,
  } = useInfiniteScroll<PaginatedResponse<RankingListSnippet>>(
    getKey,
    fetcher,
    { fallbackData: [initialData] } // ← 配列で渡す
  );

  return (
    <div className="space-y-4">
      <SearchTabs current={tab} onChange={setTab} />
      <SearchSortTabs current={sort} onChange={setSort} />
      <SearchResultList
        items={lists}
        isLoadingInitial={isLoadingInitialData}
        isLoadingMore={isLoadingMore}
        isReachingEnd={isReachingEnd}
        loadMoreRef={loadMoreRef}
      />
    </div>
  );
}
