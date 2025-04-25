// components/component/profiles/SortableListItem.tsx
//「ランキングリストの1つのアイテムをどう表示するか」と「ドラッグ可能にするための処理」
"use client"; // useSortable を使うので Client Component

import Link from "next/link";
import { ListStatus } from "@prisma/client"; // ListStatus をインポート
import type { RankingListSnippet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "@/components/component/Icons"; // アイコンパス確認
import Image from "next/image";

interface SortableItemProps {
  list: RankingListSnippet;
  isCurrentUser: boolean;
}

export function SortableListItem({ list, isCurrentUser }: SortableItemProps) {
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

  // ★★★ タイトルと TOP N を結合 ★★★
  const displayTitle = `${list.subject} TOP ${list._count?.items ?? 0}`;
  const listDetailUrl = `/rankings/${list.id}`;

  return (
    <li ref={setNodeRef} style={style} {...attributes} className='flex items-center gap-2 relative'>
      {/* ドラッグハンドル (自分自身の場合のみ) */}
      {isCurrentUser && (
        <button {...listeners} className='cursor-grab touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground' title='ドラッグして並び替え' type='button' aria-label={`ランキング ${list.subject} を並び替え`}>
          <GripVertical className='h-5 w-5' />
        </button>
      )}
      {/* ランキングカード本体へのリンク */}
      <Link href={listDetailUrl} className={`flex-1 block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors ${!isCurrentUser ? "ml-7" : ""}`}>
        {/* ★ 修正後のタイトル表示 ★ */}
        <h3 className='text-lg font-semibold mb-2 truncate' title={displayTitle}>
           {displayTitle}
        </h3>
        {/* アイテムプレビュー (変更なし) */}
        {list.items.length > 0 ? (
           <ol className='list-none pl-0 space-y-1 text-sm text-muted-foreground'> {/* pl-4 を削除 */}
              {list.items.map((item) => (
                 <li key={item.id} className='truncate flex items-center gap-2'> {/* flex を追加 */}
                    <span className='font-medium w-5 text-center'>{item.rank}.</span> {/* 幅指定 */}
                    {item.imageUrl && (            
                     <div className="relative w-6 h-6 flex-shrink-0 rounded-sm overflow-hidden border">
                      <Image
                        src={item.imageUrl}
                        alt={item.itemName} // alt を設定
                        fill // 親要素に合わせて表示
                        className="object-cover rounded-sm" // object-cover を指定
                        sizes="24px" // 小さい画像なのでサイズ指定 (任意)
                      />
                   </div>)}
                    <span>{item.itemName}</span>
                 </li>
              ))}
              {(list._count?.items ?? 0) > list.items.length && (
                 <li className='text-xs text-muted-foreground pt-1 pl-7'>...さらに表示</li> // インデント調整
              )}
           </ol>
         ) : ( <p className='text-sm text-muted-foreground'> アイテムがありません。 </p> )}
        {/* 更新日時とステータス */}
        <div className='text-xs text-muted-foreground mt-2 text-right'>
          {list.status === ListStatus.DRAFT && ( <Badge variant='outline' className='mr-2'> 下書き </Badge> )}
          {new Date(list.updatedAt).toLocaleDateString("ja-JP", { year: 'numeric', month: 'short', day: 'numeric' })} 更新
        </div>
      </Link>
    </li>
  );
}