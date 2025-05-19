//components/cpnents/component/profiles/SortableListItem.tsx
"use client";

import Link from "next/link";
import type { RankingListSnippet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "@/components/Icons";
import { Trophy } from "@/components/Icons";

interface SortableListItemProps {
  list: RankingListSnippet;
  isCurrentUser: boolean;
}

export function SortableListItem({
  list,
  isCurrentUser,
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const displayTitle = `${list.subject} TOP ${list._count?.items ?? 0}`;
  const detailUrl = `/rankings/${list.id}`;

  const getColor = (rank: number) =>
    rank === 1
      ? "text-yellow-500"
      : rank === 2
      ? "text-gray-400"
      : rank === 3
      ? "text-amber-600"
      : "text-gray-500";

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className='flex items-start gap-2 relative'
    >
      {isCurrentUser && (
        <button
          {...listeners}
          className='cursor-grab p-1 text-muted-foreground hover:text-foreground'
          title='ドラッグして並び替え'
        >
          <GripVertical className='h-5 w-5' />
        </button>
      )}

      <Link
        href={detailUrl}
        className='flex-1 block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors'
      >
        <h3
          className='text-lg font-semibold mb-2 truncate'
          title={displayTitle}
        >
          {displayTitle}
        </h3>

        {list.items.length > 0 ? (
          <ol className='list-none space-y-2 text-sm'>
            {list.items.map((item) => (
              <li key={item.id} className='flex items-center gap-2'>
                <div className='flex items-center justify-center h-6 w-6 bg-gray-100 rounded-full'>
                  <Trophy className={`h-4 w-4 ${getColor(item.rank)}`} />
                </div>
                <span className='font-medium truncate'>
                  {item.rank}. {item.itemName}
                </span>
              </li>
            ))}
            {list._count.items > list.items.length && (
              <li className='text-xs text-muted-foreground pl-8'>
                …さらに表示
              </li>
            )}
          </ol>
        ) : (
          <p className='text-sm text-muted-foreground'>
            アイテムがありません。
          </p>
        )}

        <div className='text-xs text-muted-foreground mt-2 text-right'>
          {list.status === "DRAFT" && (
            <Badge variant='outline' className='mr-2'>
              下書き
            </Badge>
          )}
          {new Date(list.updatedAt).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}{" "}
          更新
        </div>
      </Link>
    </li>
  );
}
