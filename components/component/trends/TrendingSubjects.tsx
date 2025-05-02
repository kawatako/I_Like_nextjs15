// components/component/trends/TrendingSubjects.tsx
import React from "react";

export interface TrendingSubject {
  subject: string;
  count: number;
}

interface Props {
  subjects: TrendingSubject[];
  isLoading: boolean;
  isError: any;
}

export default function TrendingSubjects({
  subjects,
  isLoading,
  isError
}: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <ul>
      {subjects.map((s: TrendingSubject, idx: number) => (
        <li key={idx}>
          {s.subject} ({s.count})
        </li>
      ))}
    </ul>
  );
}
