// components/component/profile/ProfileRankingLists.tsx
"use client";

import { useState, useEffect, useRef, useCallback} from 'react'; // ★ SVGProps を追加 (GripVertical で使う場合) ★
import Link from "next/link";
import { ListStatus} from "@prisma/client";
import type { RankingListSnippet } from "@/lib/types"; // RankingSnippetForProfile 型をインポート
import { loadMoreProfileRankingsAction,updateRankingListOrderAction } from "@/lib/actions/rankingActions"; // Server Action をインポート
import { Badge } from "@/components/ui/badge"; // Badge をインポート
import { useToast } from "@/components/hooks/use-toast"; // Toast をインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from '@/components/component/Icons'; // ★ アイコンをインポート (パスを確認) ★

// Props の型定義
interface ProfileRankingListsProps {
  targetUserId: string;
  username: string;
  status: ListStatus;
  initialLists: RankingListSnippet[];
  initialNextCursor: string | null;
  isCurrentUser: boolean;
}

// ★ Sortable なリストアイテムコンポーネント ★
interface SortableItemProps {
  list: RankingListSnippet;
  isCurrentUser: boolean;
}

function SortableListItem({ list, isCurrentUser }: SortableItemProps) {
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

  const listDetailUrl = `/rankings/${list.id}`;

  return (
    <li ref={setNodeRef} style={style} {...attributes} className='flex items-center gap-2 relative'>
      {isCurrentUser && (
        <button {...listeners} className='cursor-grab touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground' title='ドラッグして並び替え' type='button' aria-label={`ランキング ${list.subject} を並び替え`}>
          <GripVertical className='h-5 w-5' />
        </button>
      )}
      <Link href={listDetailUrl} className={`flex-1 block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors ${!isCurrentUser ? "ml-7" : ""}`}>
        <h3 className='text-lg font-semibold mb-2'> {list.subject} </h3>
        {list.items.length > 0 ? ( <ol className='list-none pl-4 space-y-1 text-sm text-muted-foreground'> {list.items.map((item) => ( <li key={item.id} className='truncate'> <span className='font-medium mr-2'>{item.rank}.</span> {item.itemName} </li> ))} {(list._count?.items ?? 0) > list.items.length && ( <li className='text-xs text-muted-foreground pt-1'>...</li> )} </ol> ) : ( <p className='text-sm text-muted-foreground pl-4'> アイテムがありません。 </p> )}
        <div className='text-xs text-muted-foreground mt-2 text-right'> {list.status === ListStatus.DRAFT && ( <Badge variant='outline' className='mr-2'> 下書き </Badge> )} {new Date(list.updatedAt).toLocaleDateString("ja-JP")} 更新 </div>
      </Link>
    </li>
  );
}


// ★★★ ProfileRankingLists コンポーネント本体 ★★★
export function ProfileRankingLists({
  targetUserId,
  username,
  status,
  initialLists,
  initialNextCursor,
  isCurrentUser,
}: ProfileRankingListsProps) {

  // ★★★ フックと関数定義は必ずコンポーネントの内側 ★★★

  // --- State 定義 ---
  const [lists, setLists] = useState<RankingListSnippet[]>(initialLists);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialNextCursor);
  const [isSavingOrder, setIsSavingOrder] = useState(false); 
  const observerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast(); 

  // --- データ読み込み関数 ---
  const loadMoreLists = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;
    setIsLoading(true);
    console.log(`[ProfileRankingLists] Loading more ${status} lists for ${targetUserId}, cursor: ${cursor}`);
    try {
      const result = await loadMoreProfileRankingsAction( targetUserId, status, cursor );
      if (result && result.items) {
        setLists((prevLists: RankingListSnippet[]) => [...prevLists, ...result.items]);
        setCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
        console.log(`[ProfileRankingLists] Loaded ${result.items.length} items. Next cursor: ${result.nextCursor}`);
      } else {
        console.warn("[ProfileRankingLists] loadMoreProfileRankingsAction returned unexpected data:", result);
        setHasMore(false);
      }
    } catch (error) {
      console.error("[ProfileRankingLists] Error in loadMoreLists:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, targetUserId, status]);

  // --- Intersection Observer 設定 ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreLists();
        }
      },
      { threshold: 1.0 }
    );
    const currentObserverRef = observerRef.current;
    if (currentObserverRef) { observer.observe(currentObserverRef); }
    return () => { if (currentObserverRef) { observer.unobserve(currentObserverRef); }};
  }, [hasMore, isLoading, loadMoreLists]);

  // --- dnd-kit センサー設定 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, })
  );

  // --- ドラッグ終了時の処理 ---
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => { // ★ async を追加 ★
      const { active, over } = event;
      if (!over || active.id === over.id) { return; }

      // 1. State 上でリストの順序を更新
      let newLists: RankingListSnippet[] = []; // 型を明示
      setLists((currentLists) => {
        const oldIndex = currentLists.findIndex((item) => item.id === active.id);
        const newIndex = currentLists.findIndex((item) => item.id === over.id);
        newLists = arrayMove(currentLists, oldIndex, newIndex); // ★ 更新後の配列を一時変数に格納
        return newLists; // State を更新
      });

      // State 更新が反映されるのを待つ必要はないが、すぐに次の処理へ
      if (newLists.length > 0) {
        setIsSavingOrder(true); // ★ 保存開始 ★
        const orderedIds = newLists.map((list) => list.id); // ★ 新しい順序の ID 配列を作成 ★

        console.log("[ProfileRankingLists] Updating order with IDs:", orderedIds);

        try {
          // 2. Server Action を呼び出して DB に保存 ★
          const result = await updateRankingListOrderAction(orderedIds);

          if (result.success) {
            toast({ title: "ランキングの表示順を更新しました。" });
          } else {
            // エラー発生時は UI を元に戻すか、エラー表示のみにするか検討
            toast({ title: "順序の更新に失敗しました。", description: result.error, variant: "destructive" });
            // UI を元に戻す場合 (例): setLists(lists); // lists は useCallback の依存関係にある元の state
            console.error("Failed to update order:", result.error);
          }
        } catch (error) {
          toast({ title: "順序の更新中にエラーが発生しました。", variant: "destructive" });
          console.error("Error calling updateRankingListOrderAction:", error);
           // UI を元に戻す処理
        } finally {
          setIsSavingOrder(false); // ★ 保存終了 ★
        }
      }
    },
    [toast] //toast を依存関係に追加
  );

  // --- 表示部分 ---
  if (lists.length === 0 && !isLoading) {
    return ( <div className='text-center text-muted-foreground py-8'> {status === ListStatus.PUBLISHED ? (isCurrentUser ? "まだ公開済みのランキングはありません。" : "公開済みのランキングはまだありません。") : "下書きのランキングはありません。"} </div> );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isCurrentUser ? handleDragEnd : undefined} >
      <SortableContext items={lists.map((l: RankingListSnippet) => l.id)} strategy={verticalListSortingStrategy} >
        <ul className='space-y-3'>
          {lists.map((list: RankingListSnippet) => (
            <SortableListItem key={list.id} list={list} isCurrentUser={isCurrentUser} />
          ))}
        </ul>
      </SortableContext>
      <div ref={observerRef} className='h-10 flex justify-center items-center'>
        {isLoading && <p className='text-gray-500'>読み込み中...</p>}
        {!isLoading && !hasMore && lists.length > 0 && ( <p className='text-gray-500'>これ以上ありません</p> )}
      </div>
      {isSavingOrder && <p className="text-center text-sm text-muted-foreground py-2">順序を保存中...</p>}
    </DndContext>
  );
}