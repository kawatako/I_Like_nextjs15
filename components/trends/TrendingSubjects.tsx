//component/component/trends/TrendingSubjects.tsx
import React from "react";
import Link from "next/link";

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
  isError,
}: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {subjects.map((s, idx) => (
        <Link
          key={idx}
          href={`/trends/average/${encodeURIComponent(s.subject)}`}
          className="block rounded-lg shadow-sm bg-white p-4 hover:bg-gray-50 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-6 text-center">
              <span
                className={`font-bold text-xl ${
                  idx === 0
                    ? "text-yellow-500"
                    : idx === 1
                    ? "text-gray-400"
                    : idx === 2
                    ? "text-amber-600"
                    : ""
                }`}
              >
                {idx + 1}
              </span>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-bold text-base">{s.subject}</h3>
              <div className="text-sm text-muted-foreground mt-1">
                集計数: {s.count}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
