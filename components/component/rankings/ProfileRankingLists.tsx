// components/component/rankings/ProfileRankingLists.tsx
"use client"; // Link を使うため Client Component のままか、
// Link を除けば Server Component にもできる

import Link from "next/link";
import { Prisma, Sentiment } from "@prisma/client"; // Prisma型をインポート

// getUserProfileData が返す rankingLists 配列の要素の型 (items の select を反映)
// (より厳密には Prisma の型生成を使うのがベスト)
type RankingListForProfile = {
  id: string;
  sentiment: Sentiment;
  subject: string;
  // listImageUrl: string | null; // 必要なら復活
  createdAt: Date;
  items: {
    // ★ items の型を select に合わせる ★
    id: string;
    itemName: string;
    rank: number;
  }[];
};

interface ProfileRankingListsProps {
  userId: string;
  username: string;
  rankingLists: RankingListForProfile[];
  isCurrentUser: boolean;
}

export function ProfileRankingLists({
  userId,
  username,
  rankingLists,
  isCurrentUser,
}: ProfileRankingListsProps) {
  if (rankingLists.length === 0) {
    return (
      <div className='text-center text-muted-foreground py-8'>
        {isCurrentUser
          ? "まだ公開済みのランキングはありません。"
          : "公開済みのランキングはまだありません。"}
      </div>
    );
  }

  return (
    // ★ リスト全体を縦に並べるコンテナ ★
    <div className='space-y-6'>
      {rankingLists.map((list) => {
        const sentimentLabel =
          list.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";
        // ★ リスト詳細ページへのリンク URL を定義 ★
        const listDetailUrl = `/rankings/${list.id}`;

        return (
          // ★ 各リストのコンテナ (ここを Link にする) ★
          <Link
            href={listDetailUrl}
            key={list.id}
            className='block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors'
          >
            {/* リストタイトル */}
            <h3 className='text-lg font-semibold mb-2'>
              <span className='mr-2'>{sentimentLabel}</span>
              {list.subject}
            </h3>
            {/* アイテム一覧 (ol タグを使用) */}
            {list.items.length > 0 ? (
              <ol className='list-none pl-4 space-y-1 text-sm text-muted-foreground'>
                {list.items.map((item) => (
                  <li key={item.id} className='truncate'>
                    <span className='font-medium mr-2'>{item.rank}.</span>
                    {item.itemName}
                  </li>
                ))}
              </ol>
            ) : (
              <p className='text-sm text-muted-foreground pl-4'>
                アイテムがありません。
              </p>
            )}
            {/* TODO: 将来的にはここにアイテム数や作成日などを追加しても良い */}
            {/*
                         <div className="text-xs text-muted-foreground mt-2 text-right">
                             {list.items.length} items - {list.createdAt.toLocaleDateString('ja-JP')}
                         </div>
                         */}
          </Link>
        );
      })}
    </div>
  );
}
