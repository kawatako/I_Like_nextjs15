import React from "react";

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
    <ul className="space-y-4">
      {lists.map((item) => (
        <li
          key={item.id}
          className="rounded-lg shadow-sm bg-white p-4 hover:bg-gray-50 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-bold text-base">{item.subject}</h3>
          <div className="text-sm text-muted-foreground mt-1">
            {new Date(item.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
