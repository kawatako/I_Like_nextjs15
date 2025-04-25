// components/component/profiles/ProfileRankingLists.tsx
// リスト全体の管理と表示（無限スクロール、並び替えの実行）
"use client";

// --- 必要なフック、コンポーネント、型、アクションをインポート ---
import { useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { ListStatus } from "@prisma/client";
import type { RankingListSnippet, PaginatedResponse, ActionResult } from "@/lib/types";
import { loadMoreProfileRankingsAction, updateRankingListOrderAction } from "@/lib/actions/rankingActions";
import { useToast } from "@/components/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useInfiniteScroll} from '@/components/hooks/useInfiniteScroll'; // カスタムフックのパスを確認
import {SortableListItem}  from './SortableListItem'; // アイテム表示コンポーネント
import { Loader2 } from '@/components/component/Icons';
import { mutate as globalMutate } from 'swr'; // ★ グローバル mutate をインポート ★

// --- コンポーネントの Props 定義 ---
interface ProfileRankingListsProps {
  targetUserId: string;
  username: string;
  status: ListStatus; // PUBLISHED or DRAFT
  isCurrentUser: boolean;
}

// --- コンポーネント本体 ---
export function ProfileRankingLists({
  targetUserId,
  username,
  status,
  isCurrentUser,
}: ProfileRankingListsProps) {

  // --- フックの初期化 ---
  const { toast } = useToast();
  // 並び替え保存中のローディング状態
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // --- SWR Infinite Scroll の設定 ---
  // キー生成関数: ページごとに SWR が使うキーを生成
  const getKey = useCallback((pageIndex: number, previousPageData: PaginatedResponse<RankingListSnippet> | null): [string, string, ListStatus, string | null] | null => {
    if (pageIndex === 0) return ['profileRankings', targetUserId, status, null]; // 初回
    if (!previousPageData || !previousPageData.nextCursor) return null; // 終端
    return ['profileRankings', targetUserId, status, previousPageData.nextCursor]; // 次のページ
  }, [targetUserId, status]);

  // データ取得関数 (fetcher): SWR からキーを受け取り Server Action を呼び出す
  const fetcher = useCallback(async (key: [string, string, ListStatus, string | null]) => {
     const [_, tId, st, cursor] = key;
     return loadMoreProfileRankingsAction(tId, st, cursor);
  }, []);

  // useInfiniteScroll フックでデータ取得と状態管理
  const {
     data: lists, // フラット化されたリストデータ
     error,       // エラーオブジェクト
     isLoadingMore, // ローディング中か
     isReachingEnd, // 終端に達したか
     loadMoreRef,   // 無限スクロールトリガー用 ref
     isValidating,  // SWR が再検証中か
     mutate,        // SWR キャッシュ操作関数 (useSWRConfig ではなくフックから取得)
  } = useInfiniteScroll<PaginatedResponse<RankingListSnippet>>(getKey, fetcher, {
     // 初期データは SWR が初回フェッチで取得
     revalidateOnFocus: false, // 自動再検証はオフ
     revalidateOnReconnect: false,
     revalidateIfStale: false,
  });

  // --- DnD (ドラッグアンドドロップ) の設定 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ドラッグ終了時の処理 (並び替え実行)
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
      const { active, over } = event;
      // lists が取得前 (undefined) や、移動がない場合は何もしない
      if (!over || !lists || active.id === over.id) { return; }

      // 現在のリストから並び替え後の ID 配列を作成
      const oldIndex = lists.findIndex((item) => item.id === active.id);
      const newIndex = lists.findIndex((item) => item.id === over.id);
      const orderedIds = arrayMove(lists, oldIndex, newIndex).map((list) => list.id);

      // 保存中フラグを立てる
      setIsSavingOrder(true);
      console.log("[ProfileRankingLists] Updating order with IDs:", orderedIds);

      try {
        // Server Action で順序を DB に保存
        const result = await updateRankingListOrderAction(orderedIds);

        if (result.success) {
          toast({ title: "表示順を更新しました。" });
          // ★ 成功したら SWR キャッシュを再検証 (グローバル mutate を使用) ★
          //    キーフィルターでこのリストのキャッシュのみを対象にする
          const keyFilter = (key: any): boolean =>
            Array.isArray(key) && key.length >= 3 &&
            key[0] === 'profileRankings' && key[1] === targetUserId && key[2] === status;
          globalMutate(keyFilter, undefined, { revalidate: true }); // ここで再検証
        } else {
          // アクションが失敗した場合
          toast({ title: "順序の更新に失敗しました。", description: result.error, variant: "destructive" });
          // ★ エラー時も念のため再検証してサーバーの状態に戻す ★
           const keyFilter = (key: any): boolean =>
            Array.isArray(key) && key.length >= 3 &&
            key[0] === 'profileRankings' && key[1] === targetUserId && key[2] === status;
          globalMutate(keyFilter, undefined, { revalidate: true });
        }
      } catch (error) {
        // アクション呼び出し自体のエラー
         toast({ title: "順序の更新中にエラーが発生しました。", variant: "destructive" });
         console.error("Error calling updateRankingListOrderAction:", error);
          // ★ エラー時も再検証 ★
          const keyFilter = (key: any): boolean =>
            Array.isArray(key) && key.length >= 3 &&
            key[0] === 'profileRankings' && key[1] === targetUserId && key[2] === status;
          globalMutate(keyFilter, undefined, { revalidate: true });
      } finally {
        // 保存中フラグを解除
        setIsSavingOrder(false);
      }
    },
    // 依存配列: lists, status, targetUserId, toast (mutate はグローバルなので不要)
    [lists, status, targetUserId, toast]
  );

  // --- レンダリング ---

  // エラー発生時の表示
  if (error) return <div className="p-4 text-center text-red-500">読み込みに失敗しました。</div>;

  // 初回データロード中の表示 (lists がまだ undefined の場合)
  if (isLoadingMore && (!lists || lists.length === 0)) {
     return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // データが空の場合の表示 (ロード完了後)
  if (lists && lists.length === 0 && isReachingEnd) {
    return (
      <div className='text-center text-muted-foreground py-8'>
        {status === ListStatus.PUBLISHED ? "まだ公開済みのランキングはありません。" : "下書きのランキングはありません。"}
      </div>
    );
  }

  // リスト表示
  return (
    // DnDContext: isCurrentUser が true の場合のみ並び替えハンドラを渡す
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isCurrentUser ? handleDragEnd : undefined} >
      {/* SortableContext: 並び替え可能なアイテムのリスト */}
      {lists && ( // lists が存在する（初期ロード後）場合のみレンダリング
         <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy} >
           <ul className='space-y-3'>
             {/* リストアイテムを map で表示 */}
             {lists.map((list: RankingListSnippet) => (
               // SortableListItem コンポーネントを使用
               <SortableListItem key={list.id} list={list} isCurrentUser={isCurrentUser} />
             ))}
           </ul>
         </SortableContext>
      )}
      {/* 無限スクロールのトリガー要素とローディング/終端表示 */}
      <div ref={loadMoreRef} className='h-10 flex justify-center items-center'>
        {(isLoadingMore || (isValidating && lists && lists.length > 0)) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!isLoadingMore && !isValidating && isReachingEnd && lists && lists.length > 0 && ( <p className='text-gray-500 text-sm'>これ以上ありません</p> )}
      </div>
      {/* 並び替え保存中の表示 */}
      {isSavingOrder && <p className="text-center text-sm text-muted-foreground py-2">順序を保存中...</p>}
    </DndContext>
  );
}
