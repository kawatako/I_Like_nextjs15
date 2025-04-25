// components/component/profiles/LikedRankingListItem.tsx
"use client"; // FeedLike を使うので Client Component

import { useMemo } from 'react'; // useMemo を追加
import Link from "next/link";
import { ListStatus } from "@prisma/client";
import type { RankingListSnippet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image'; // ★ Image をインポート ★
// ★ FeedLike をインポート (パスを確認) ★
import {FeedLike} from "@/components/component/likes/FeedLike";
// ★ アイコンは不要になったかも (GripVertical削除) ★
// import { GripVertical } from '@/components/component/Icons';

// ★ Props から isCurrentUser を削除し、loggedInUserDbId を追加 ★
interface LikedRankingListItemProps {
  list: RankingListSnippet;
  loggedInUserDbId: string | null;
}

export default function LikedRankingListItem({ list, loggedInUserDbId }: LikedRankingListItemProps) {
  // ★ useSortable フックと関連する style, attributes, listeners は削除 ★

  // ★ タイトルと TOP N を結合 (変更なし) ★
  const displayTitle = `${list.subject} TOP ${list._count?.items ?? 0}`;
  const listDetailUrl = `/rankings/${list.id}`;

  // ★ いいねの初期状態を計算 ★
  const initialLiked = useMemo(() => {
    return loggedInUserDbId
      ? list.likes?.some((like) => like.userId === loggedInUserDbId) ?? false
      : false;
  }, [list.likes, loggedInUserDbId]);

  return (
    // ★ li タグから DnD 関連の属性 (ref, style, attributes) を削除 ★
    <li className='flex items-center gap-2 relative'> {/* シンプルな li に */}
      {/* ★ ドラッグハンドルボタンを削除 ★ */}
      {/* <button {...listeners} ...><GripVertical /></button> */}

      {/* ランキングカード本体へのリンク (ml-7 を削除) */}
      <Link href={listDetailUrl} className={`flex-1 block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors`}>
        {/* タイトル表示 (変更なし) */}
        <h3 className='text-lg font-semibold mb-2 truncate' title={displayTitle}>
           {displayTitle}
        </h3>
        {/* アイテムプレビュー (Image コンポーネント使用) */}
        {list.items.length > 0 ? (
           <ol className='list-none pl-0 space-y-1 text-sm text-muted-foreground'>
              {list.items.map((item) => (
                 <li key={item.id} className='truncate flex items-center gap-2'>
                    <span className='font-medium w-5 text-center'>{item.rank}.</span>
                    {item.imageUrl && (
                       <div className="relative w-4 h-4 flex-shrink-0 rounded-sm overflow-hidden border">
                          <Image src={item.imageUrl} alt="" fill className="object-cover rounded-sm" sizes="16px"/>
                       </div>
                    )}
                    <span>{item.itemName}</span>
                 </li>
              ))}
              {(list._count?.items ?? 0) > list.items.length && ( <li className='text-xs text-muted-foreground pt-1 pl-7'>...さらに表示</li> )}
           </ol>
         ) : ( <p className='text-sm text-muted-foreground'> アイテムがありません。 </p> )}

        {/* 更新日時とステータス & いいねボタン */}
        <div className='flex justify-between items-center text-xs text-muted-foreground mt-2'> {/* justify-between を追加 */}
           {/* 左側: ステータスと更新日時 */}
           <div>
             {list.status === ListStatus.DRAFT && ( <Badge variant='outline' className='mr-2'> 下書き </Badge> )}
             {new Date(list.updatedAt).toLocaleDateString("ja-JP", { year: 'numeric', month: 'short', day: 'numeric' })} 更新
           </div>
           {/* ★★★ 右側: いいねボタンを追加 ★★★ */}
           <div>
              <FeedLike
                 targetType="RankingList"
                 targetId={list.id}
                 likeCount={list.likeCount}
                 initialLiked={initialLiked}
              />
           </div>
           {/* ★★★ ここまで ★★★ */}
        </div>
      </Link>
    </li>
  );
}