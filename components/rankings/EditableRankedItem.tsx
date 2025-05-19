//components/rankings/EditableRankedItem.tsx
"use client";

import { useRef, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImagePlus, TrashIcon, XIcon, GripVertical } from "@/components/Icons";
import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type EditableItem = {
  clientId: string;
  id?: string;
  itemName: string;
  itemDescription?: string | null;
  imagePath?: string | null;
  previewUrl?: string | null;
  imageFile?: File | null;
};

interface Props {
  clientId: string;
  item: EditableItem;
  index: number;
  handleItemChange: (
    clientId: string,
    field: keyof Omit<
      EditableItem,
      "clientId" | "id" | "imageFile" | "previewUrl" | "imagePath"
    >,
    value: string | null
  ) => void;
  handleDeleteItem: (clientId: string) => void;
  handleItemImageChange: (clientId: string, file: File | null) => void;
  isSaving: boolean;
}

export function EditableRankedItem({
  clientId,
  item,
  index,
  handleItemChange,
  handleDeleteItem,
  handleItemImageChange,
  isSaving,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clientId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const itemImageInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleItemImageChange(clientId, event.target.files?.[0] ?? null);
    if (event.target) event.target.value = "";
  };

  const onRemoveImage = () => {
    handleItemImageChange(clientId, null);
    if (itemImageInputRef.current) itemImageInputRef.current.value = "";
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className='flex items-start gap-3 p-3 bg-secondary/50 dark:bg-secondary/30 rounded relative border'
    >
      {/* ドラッグハンドル */}
      <button
        {...listeners}
        className='cursor-grab touch-none p-1 mt-6 text-muted-foreground hover:text-foreground'
        title='ドラッグして並び替え'
        type='button'
      >
        <GripVertical className='h-5 w-5' />
      </button>

      {/* 順位表示 */}
      <span className='font-semibold w-8 text-center text-muted-foreground pt-7 whitespace-nowrap'>
        {`${index + 1}位`}
      </span>

      {/* 画像アップロード／プレビュー */}
      <div className='flex-shrink-0 pt-1'>
        {item.previewUrl ? (
          <div className='relative w-20 h-20 rounded border bg-muted'>
            <Image
              src={item.previewUrl}
              alt={`${item.itemName || "Item"} preview`}
              fill
              className='object-cover rounded'
            />
            <Button
              type='button'
              variant='destructive'
              size='icon'
              className='absolute -top-2 -right-2 h-6 w-6 rounded-full z-10'
              onClick={onRemoveImage}
              disabled={isSaving}
              title='画像削除'
            >
              <XIcon className='h-4 w-4' />
            </Button>
          </div>
        ) : (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='w-20 h-20 flex flex-col items-center justify-center text-muted-foreground bg-background'
            onClick={() => itemImageInputRef.current?.click()}
            disabled={isSaving}
          >
            <ImagePlus className='h-6 w-6 mb-1' />
            <span className='text-xs'>画像選択</span>
          </Button>
        )}
        <input
          type='file'
          accept='image/*'
          ref={itemImageInputRef}
          onChange={onFileChange}
          className='hidden'
          disabled={isSaving}
        />
      </div>

      {/* アイテム入力 */}
      <div className='flex-1 space-y-1 pt-1'>
        <Input
          value={item.itemName}
          onChange={(e) =>
            handleItemChange(clientId, "itemName", e.target.value)
          }
          placeholder={`${index + 1}位のアイテム名*`}
          maxLength={100}
          className='bg-background font-medium'
          required
          disabled={isSaving}
        />
        <Textarea
          value={item.itemDescription ?? ""}
          onChange={(e) =>
            handleItemChange(clientId, "itemDescription", e.target.value)
          }
          placeholder='アイテムの説明・コメント（任意）'
          rows={2}
          maxLength={500}
          className='text-sm bg-background'
          disabled={isSaving}
        />
      </div>

      {/* 削除ボタン */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => handleDeleteItem(clientId)}
        title='アイテム削除'
        disabled={isSaving}
        className='mt-1 text-muted-foreground hover:text-destructive'
      >
        <TrashIcon className='h-4 w-4' />
      </Button>
    </li>
  );
}
