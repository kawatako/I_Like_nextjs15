// components/component/trends/TrendingTags.tsx
import React from "react";

export interface TrendingTag {
  tagName: string;
  count: number;
}

interface Props {
  tags: TrendingTag[];
  isLoading: boolean;
  isError: any;
}

export default function TrendingTags({
  tags,
  isLoading,
  isError
}: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <ul>
      {tags.map((t: TrendingTag, idx: number) => (
        <li key={idx}>
          {t.tagName} ({t.count})
        </li>
      ))}
    </ul>
  );
}
