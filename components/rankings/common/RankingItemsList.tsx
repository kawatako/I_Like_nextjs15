// components/rankings/common/RankingItemsList.tsx
// アイテムの並び替えと編集スロット表示を管理するコンポーネント

import React, { FC } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditableRankedItem, type EditableItem } from "./EditableRankedItem";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "@/components/Icons";

// Props: RankingItemsList に渡すデータと操作ハンドラを定義するインターフェース
interface Props {
  subject: string;
  items: EditableItem[];
  onItemChange: (
    clientId: string,
    field: "itemName" | "itemDescription",
    value: string | null
  ) => void;
  onDeleteItem: (clientId: string) => void;
  onImageChange: (clientId: string, file: File | null) => void;
  onAddItem: () => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  isLoading: boolean;
}

// RankingItemsList: DnD でアイテムを並び替え・編集可能なリスト UI
export const RankingItemsList: FC<Props> = ({
  subject,
  items,
  onItemChange,
  onDeleteItem,
  onImageChange,
  onAddItem,
  onReorder,
  isLoading,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // handleDragEnd: DnD 操作後に並び替え順序を通知する
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.clientId === active.id);
      const newIndex = items.findIndex((i) => i.clientId === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <Card>
      <CardHeader>ランキングアイテム</CardHeader>
      <CardContent className="pt-0 space-y-3">
        {items.length === 0 && <p>「+ アイテム追加」から開始</p>}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">
              {items.map((item, idx) => (
                <EditableRankedItem
                  key={item.clientId}
                  subject={subject}
                  clientId={item.clientId}
                  item={item}
                  index={idx}
                  handleItemChange={onItemChange}
                  handleDeleteItem={onDeleteItem}
                  handleItemImageChange={onImageChange}
                  isSaving={isLoading}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <Button variant="outline" size="sm" onClick={onAddItem} disabled={isLoading}>
          <PlusIcon className="h-4 w-4 mr-2" /> アイテム追加
        </Button>
      </CardContent>
    </Card>
  );
};