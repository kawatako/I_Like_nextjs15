// components/rankings/ShareModal.tsx
//ランキング作成時に自動で表示されるシェアモーダル

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareButton } from "./ShareButton";

interface Props {
  subject: string;
  tags: { tag: { name: string } }[];
}

export default function ShareModal({ subject, tags }: Props) {
  //URL のクエリ文字列（?share=1）を読み取る
  const searchParams = useSearchParams();
  //モーダルを閉じるときに URL を書き換える
  const router       = useRouter();
  const [open, setOpen] = useState(false);

  // クエリに share=1 があればモーダルを開く
  useEffect(() => {
    if (searchParams.get("share") === "1") {
      setOpen(true);
    }
  }, [searchParams]);

  // 閉じるときは URL から ?share=1 を除去
  const handleClose = () => {
    setOpen(false);
    router.replace(window.location.pathname, { scroll: false });
  };

  // シェア用の完全 URL を組み立て
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>作ったランキングをシェアしよう！</DialogTitle>
        </DialogHeader>

        <div className="py-4 flex justify-center">
          <ShareButton subject={subject} tags={tags} url={shareUrl} />
        </div>

        <div className="pt-4 text-right">
          <button
            onClick={handleClose}
            className="text-sm text-gray-500 hover:underline"
          >
            閉じる
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
