// components/component/trends/NewList.tsx
import React from "react";
import Link from "next/link";

export interface NewListEntry {
  id: string;
  subject: string;
  createdAt: string;
}

interface Props {
  lists: NewListEntry[];
  isLoading: boolean;
  isError: any;
}

export default function NewList({ lists, isLoading, isError }: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {lists.map((item) => (
        <li
          key={item.id}
          className="rounded-lg shadow-sm bg-white p-4 hover:bg-gray-50 hover:shadow-lg transition-shadow"
        >
          <Link href={`/rankings/${item.id}`} className="block h-full">
            <h3 className="font-bold text-base">{item.subject}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}