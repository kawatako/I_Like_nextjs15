// components/component/search/SearchPageClient.tsx
"use client";

import { useState, useCallback } from "react";
import type { PaginatedResponse, RankingListSnippet, UserSnippet } from "@/lib/types";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll";
import { searchRankingListsAction, searchUsersAction } from "@/lib/actions/searchActions";
import SearchTabs from "@/components/component/search/SearchTabs";
import SearchSortTabs from "@/components/component/search/SearchSortTabs";
import SearchResultList from "@/components/component/search/SearchResultList";

interface Props {
  initialData: PaginatedResponse<RankingListSnippet | UserSnippet>;
  query: string;
  initialTab: "title" | "item" | "tag" | "user";
  initialSort: "count" | "new" | "like" | "username" | "name";
}

type SearchKey = readonly [
  "search",
  string,
  "title" | "item" | "tag" | "user",
  "count" | "new" | "like" | "username" | "name",
  string?
];

export default function SearchPageClient({
  initialData,
  query,
  initialTab,
  initialSort,
}: Props) {
  const [tab, setTab] = useState<Props["initialTab"]>(initialTab);
  const [sort, setSort] = useState<Props["initialSort"]>(initialSort);

  const getKey = useCallback(
    (pageIndex: number, prev: PaginatedResponse<RankingListSnippet | UserSnippet> | null) => {
      if (pageIndex === 0) {
        return ["search", query, tab, sort, undefined] as SearchKey;
      }
      if (!prev?.nextCursor) return null;
      return ["search", query, tab, sort, prev.nextCursor] as SearchKey;
    },
    [query, tab, sort]
  );

  const fetcher = useCallback(
    ([, q, t, s, cursor]: SearchKey) => {
      if (t === "user") {
        return searchUsersAction(q, s as "username" | "name", cursor);
      }
      return searchRankingListsAction(q, t as "title" | "item" | "tag", s as "count" | "new" | "like", cursor);
    },
    []
  );

  const {
    data: lists,
    isLoadingInitialData,
    isLoadingMore,
    isReachingEnd,
    loadMoreRef,
  } = useInfiniteScroll<PaginatedResponse<RankingListSnippet | UserSnippet>>(
    getKey,
    fetcher,
    { fallbackData: [initialData] }
  );

  return (
    <div className="space-y-4">
      <SearchTabs current={tab} onChange={setTab} />
      <SearchSortTabs current={sort} onChange={(s) => setSort(s as Props["initialSort"])} tab={tab} />
      <SearchResultList
        items={lists}
        tab={tab}
        isLoadingInitial={isLoadingInitialData}
        isLoadingMore={isLoadingMore}
        isReachingEnd={isReachingEnd}
        loadMoreRef={loadMoreRef}
      />
    </div>
  );
}
