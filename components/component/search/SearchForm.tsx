// components/component/search/SearchForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/component/Icons";

export default function SearchForm() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // 検索ページへ遷移
    router.push(`/search?q=${encodeURIComponent(q)}`);
    // フォームをクリア（任意）
    // setSearchQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <Input
        type="text"
        placeholder="ランキングやアイテムを検索…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pr-10 rounded-full border h-9"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        aria-label="検索"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
