// app/search/page.tsx

import SearchPageClient from "@/components/component/search/SearchPageClient";
import { searchRankingListsAction } from "@/lib/actions/searchActions";
import type { Metadata } from "next";
import type { PaginatedResponse, RankingListSnippet } from "@/lib/types";

export const metadata: Metadata = {
  title: "検索 – I Like",
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string | string[];
    tab?: string | string[];
    sort?: string | string[];
    cursor?: string | string[];
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : "";
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) as
    | "title"
    | "item"
    | "tag"
    | undefined;
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as
    | "count"
    | "new"
    | "like"
    | undefined;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;

  // デフォルト値
  const finalTab = tab ?? "title";
  const finalSort = sort ?? "count";

  // 初回データ取得 (Server Action)
  const initialData: PaginatedResponse<RankingListSnippet> =
    await searchRankingListsAction(q, finalTab, finalSort, cursor);

  return (
    <SearchPageClient
      initialData={initialData}
      query={q}
      initialTab={finalTab}
      initialSort={finalSort}
    />
  );
}
