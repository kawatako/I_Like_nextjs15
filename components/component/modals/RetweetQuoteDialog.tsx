// components/component/modals/RetweetQuoteDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RepeatIcon, PenSquareIcon } from "@/components/component/Icons";

interface RetweetQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetweet: () => void; // リポスト選択時の処理
  onQuote: () => void; // 引用選択時の処理
}

export function RetweetQuoteDialog({
  open,
  onOpenChange,
  onRetweet,
  onQuote,
}: RetweetQuoteDialogProps) {
  const handleRetweetClick = () => {
    onRetweet();
    onOpenChange(false); // ダイアログを閉じる
  };

  const handleQuoteClick = () => {
    onQuote();
    onOpenChange(false); // ダイアログを閉じる
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>アクションを選択</DialogTitle>
          {/* <DialogDescription>どちらを実行しますか？</DialogDescription> */}
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Button
            variant='ghost'
            onClick={handleRetweetClick}
            className='flex items-center justify-start gap-2'
          >
            <RepeatIcon className='h-5 w-5' />
            リポスト
          </Button>
          <Button
            variant='ghost'
            onClick={handleQuoteClick}
            className='flex items-center justify-start gap-2'
          >
            <PenSquareIcon className='h-5 w-5' />
            引用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
