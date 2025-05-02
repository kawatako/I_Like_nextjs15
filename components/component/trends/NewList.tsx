// components/component/trends/NewList.tsx
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

export default function NewList({
  lists,
  isLoading,
  isError
}: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <ul>
      {lists.map((item: NewListEntry, idx: number) => (
        <li key={item.id /* id があるのでこちらをキーに */}>
          <strong>{item.subject}</strong>
          <br />
          <small>{new Date(item.createdAt).toLocaleString()}</small>
        </li>
      ))}
    </ul>
  );
}
