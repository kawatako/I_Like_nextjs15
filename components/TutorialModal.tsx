// components/TutorialModal.tsx
//　チュートリアル表示モーダル
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import  useEmblaCarousel  from "embla-carousel-react";
import Image from "next/image";

export default function TutorialModal({
  open, //親コンポーネントから「モーダルを開く／閉じる」を指示されるフラグ
  onClose, //閉じるときに呼ばれるコールバック
}: {
  open: boolean;
  onClose: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(open); //<Dialog> の open に渡す、内部管理用の開閉フラグ

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  //親からの開閉指示を同期 openが変わったら visible も変更
  useEffect(() => {
    setVisible(open);
  }, [open]);

  //ページ URL に ?tutorial=1 が付いていれば、初回表示時に自動でモーダルを開く
  useEffect(() => {
    if (searchParams.get("tutorial") === "1") {
      setVisible(true);
    }
  }, [searchParams]);

  //自身の visible を閉じつつ、親に onClose 通知 router.replace() で URL から ?tutorial=1 を消してクリーンに戻す
  const handleClose = () => {
    setVisible(false);
    onClose();
    router.replace(window.location.pathname, { scroll: false });
  };

  const slides = [
    "slide1.png",
    "slide2.png",
    "slide3.png",
    "slide4.png",
    "slide5.png",
  ];

  return (
    <Dialog open={visible} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>はじめての使い方</DialogTitle>
        </DialogHeader>

        {/* Embla コンテナ */}
        <div className="embla h-80">
          <div className="embla__container" ref={emblaRef}>
            {slides.map((file) => (
              <div key={file} className="embla__slide flex items-center justify-center">
                <div className="relative w-full h-80">
                  <Image
                    src={`/tutorial/${file}`}
                    alt={`チュートリアル ${file}`}
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 簡易ドットナビ */}
        <div className="flex justify-center space-x-2 mt-4">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi && emblaApi.scrollTo(idx)}
              className="w-3 h-3 rounded-full bg-gray-300 hover:bg-primary transition-colors"
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="text-sm text-primary hover:underline"
          >
            閉じる
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}