// components/component/layouts/FloatingActionButtons.tsx
// 使わない
"use client"; 
import Link from "next/link";
import { Button } from "@/components/ui/button"; // shadcn/ui の Button
// lucide-react からアイコンをインポート (なければ npm install lucide-react)
import { PlusIcon, CrownIcon } from "../Icons";
export function FloatingActionButtons() {
  // ボトムバーの高さ (h-16 = 4rem = 64px) + 下からのマージン (例: 1rem = 16px)
  const bottomOffset = "bottom-[calc(4rem+1rem)]"; // bottom-20 (80px) とほぼ同じ

  return (
    // fixed: 画面に固定, bottom/right: 位置指定, z-40: 重なり順
    // flex flex-col space-y-2: 中のボタンを縦に並べて間隔を空ける
    // md:hidden: モバイル専用
    <div
      className={`fixed ${bottomOffset} right-4 z-40 flex flex-col space-y-2 md:hidden`}
    >

      {/* ランキング作成ボタン (王冠) */}
      <Link href='/rankings/new' passHref>
        {/* ★ 要変更: ランキング作成ページのパス */}
        <Button
          variant='secondary'
          size='icon'
          className='rounded-full shadow-lg w-14 h-14'
        >
          <CrownIcon className='h-6 w-6' />
          <span className='sr-only'>ランキングを作成</span>{" "}
          {/* スクリーンリーダー用 */}
        </Button>
      </Link>
    </div>
  );
}
