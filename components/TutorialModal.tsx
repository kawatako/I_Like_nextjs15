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
//コンポーネント (Swiper, SwiperSlide) で実際のカルーセルを組み立て、モジュール (Pagination) でナビゲーション機能を拡張し、CSS (swiper/css, swiper/css/pagination) で見た目（レイアウト・装飾）を当てている
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
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
    ,
    "slide5.png",
  ];

  return (
    <Dialog open={visible} onOpenChange={handleClose}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>はじめての使い方</DialogTitle>
        </DialogHeader>

        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={20}
          slidesPerView={1}
          className='h-80'
        >
          {slides.map((file) => (
            <SwiperSlide
              key={file}
              className='flex items-center justify-center'
            >
              <div className='relative w-full h-80'>
                <Image
                  src={`/tutorial/${file}`}
                  alt={`チュートリアル ${file}`}
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className='mt-6 flex justify-end'>
          <button
            onClick={handleClose}
            className='text-sm text-primary hover:underline'
          >
            閉じる
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
