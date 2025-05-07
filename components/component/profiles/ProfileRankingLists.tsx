"use client";

import { useState, useCallback } from "react";
import type { RankingListSnippet, PaginatedResponse, ActionResult } from "@/lib/types";
import { loadMoreProfileRankingsAction, updateRankingListOrderAction } from "@/lib/actions/rankingActions";
import { useToast } from "@/components/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll";
import { SortableListItem } from "./SortableListItem";
import { Loader2 } from "@/components/component/Icons";
import { mutate as globalMutate } from "swr";

// "DRAFT" or "PUBLISHED"
type ListStatusLiteral = "DRAFT" | "PUBLISHED";

interface ProfileRankingListsProps {
  targetUserId: string;
  username: string;
  status: ListStatusLiteral;
  isCurrentUser: boolean;
}

export function ProfileRankingLists({
  targetUserId,
  status,
  isCurrentUser,
}: ProfileRankingListsProps) {
  const { toast } = useToast();
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const getKey = useCallback(
    (pageIndex: number, prev: PaginatedResponse<RankingListSnippet> | null) => {
      if (pageIndex === 0) return ["profileRankings", targetUserId, status, null] as const;
      if (!prev?.nextCursor) return null;
      return ["profileRankings", targetUserId, status, prev.nextCursor] as const;
    },
    [targetUserId, status]
  );

  const fetcher = useCallback(
    async ([_key, tId, st, cursor]: readonly [string, string, ListStatusLiteral, string | null]) =>
      loadMoreProfileRankingsAction(tId, st, cursor),
    []
  );

  const {
    data,
    error,
    isLoadingMore,
    isReachingEnd,
    loadMoreRef,
    isValidating,
  } = useInfiniteScroll<PaginatedResponse<RankingListSnippet>>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  // data が undefined のときは空配列に
  const lists: RankingListSnippet[] = data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = lists.findIndex((l) => l.id === active.id);
      const newIndex = lists.findIndex((l) => l.id === over.id);
      const orderedIds = arrayMove(lists, oldIndex, newIndex).map((l) => l.id);

      setIsSavingOrder(true);
      try {
        const result: ActionResult = await updateRankingListOrderAction(orderedIds);
        const keyFilter = (key: any) =>
          Array.isArray(key) &&
          key[0] === "profileRankings" &&
          key[1] === targetUserId &&
          key[2] === status;

        if (result.success) {
          toast({ title: "表示順を更新しました。" });
        } else {
          toast({ title: "順序の更新に失敗しました。", description: result.error, variant: "destructive" });
        }
        globalMutate(keyFilter, undefined, { revalidate: true });
      } catch {
        toast({ title: "順序の更新中にエラーが発生しました。", variant: "destructive" });
        globalMutate(
          (key: any) => Array.isArray(key) && key[0] === "profileRankings" && key[1] === targetUserId && key[2] === status,
          undefined,
          { revalidate: true }
        );
      } finally {
        setIsSavingOrder(false);
      }
    },
    [lists, targetUserId, status, toast]
  );

  if (error) {
    return <div className="p-4 text-center text-red-500">読み込みに失敗しました。</div>;
  }

  if (isLoadingMore && lists.length === 0) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lists.length === 0 && isReachingEnd) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {status === "PUBLISHED" ? "まだ公開済みのランキングはありません。" : "下書きのランキングはありません。"}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isCurrentUser ? handleDragEnd : undefined}>
      <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {lists.map((list) => (
            <SortableListItem key={list.id} list={list} isCurrentUser={isCurrentUser} />
          ))}
        </ul>
      </SortableContext>

      <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
        {(isLoadingMore || (isValidating && lists.length > 0)) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!isLoadingMore && !isValidating && isReachingEnd && lists.length > 0 && (
          <p className="text-gray-500 text-sm">これ以上ありません</p>
        )}
      </div>

      {isSavingOrder && <p className="text-center text-sm text-muted-foreground py-2">順序を保存中...</p>}
    </DndContext>
);}
