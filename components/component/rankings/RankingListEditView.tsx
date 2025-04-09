"use client";

import { useState, useEffect } from "react";
import { Prisma, Sentiment, ListStatus } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveRankingListItemsAction } from "@/lib/actions/rankingActions";
import { useToast } from "@/components/hooks/use-toast";
import { PlusIcon, TrashIcon, GripVertical } from "lucide-react";
import { deleteRankingListAction } from "@/lib/actions/rankingActions"; 
import { useActionState } from "react";
import { useRouter } from 'next/navigation';

// dnd-kit のインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 型定義
const rankingListWithItemsPayload = Prisma.validator<Prisma.RankingListDefaultArgs>()({
  include: { items: { orderBy: { rank: 'asc' } } },
});
type RankingListWithItems = Prisma.RankingListGetPayload<typeof rankingListWithItemsPayload>;

interface EditableItem {
  clientId: string;
  id?: string;
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null;
}

interface RankingListEditViewProps {
  rankingList: RankingListWithItems;
}

export function RankingListEditView({ rankingList }: RankingListEditViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [subject, setSubject] = useState(rankingList.subject);
  const [description, setDescription] = useState(rankingList.description ?? "");
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    rankingList.items.map(item => ({
      clientId: item.id,
      id: item.id,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageUrl: item.imageUrl,
    }))
  );

  // アイテム追加処理
  const handleAddItemSlot = () => {
    if (editableItems.length < 10) {
      const newClientId = `new-${Date.now()}-${Math.random()}`;
      setEditableItems([...editableItems, { clientId: newClientId, itemName: "", itemDescription: null, imageUrl: null }]);
    } else {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
    }
  };

  // アイテム入力変更処理
  const handleItemChange = (index: number, field: keyof Omit<EditableItem, 'clientId' | 'id'>, value: string | null) => {
    const newItems = [...editableItems];
    (newItems[index] as any)[field] = value;
    setEditableItems(newItems);
  };

  // アイテム削除処理
  const handleDeleteItem = (index: number) => {
    const newItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(newItems);
  };

  // 保存処理
  const handleSave = async (status: ListStatus) => {
    setIsSaving(true);
    // バリデーション
    if (subject.trim() === "") { toast({ title: "テーマを入力してください。", variant: "destructive" }); setIsSaving(false); return; }
    if (status === ListStatus.PUBLISHED) {
      if (editableItems.some(item => item.itemName.trim() === "")) { toast({ title: "公開するには、すべてのアイテム名を入力してください。", variant: "destructive" }); setIsSaving(false); return; }
      if (editableItems.length === 0) { toast({ title: "公開するにはアイテムを1つ以上登録してください。", variant: "destructive" }); setIsSaving(false); return; }
    }
    // アクション呼び出し
    const itemsDataForSave = editableItems.map(({ clientId, id, ...rest }) => rest);
    const result = await saveRankingListItemsAction( rankingList.id, itemsDataForSave, subject, description, status );
    setIsSaving(false);
    if (result.success) { toast({ title: status === ListStatus.DRAFT ? "下書きを保存しました。" : "ランキングを公開しました。" }); 
    router.push(`/rankings/${rankingList.id}`);
  }
    else { toast({ title: "保存に失敗しました", description: result.error, variant: "destructive" }); }
  };

  // dnd-kit センサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // dnd-kit ドラッグ終了処理
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems((items) => {
        const oldIndex = items.findIndex(item => item.clientId === active.id);
        const newIndex = items.findIndex(item => item.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const sentimentLabel = rankingList.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";

  // 削除ボタンの処理
  const [deleteState, deleteFormAction] = useActionState(deleteRankingListAction, { success: false });
  
    // 削除ボタンが押されたときの処理（確認ダイアログ）
    const handleDeleteConfirm = (event: React.FormEvent<HTMLFormElement>) => {
      if (!window.confirm(`ランキング「${subject}」を本当に削除しますか？この操作は元に戻せません。`)) {
        event.preventDefault(); // フォーム送信をキャンセル
      }
      // 確認が OK ならフォームが送信される (action={deleteFormAction})
    };

  return (
    // DndContext でラップ
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* --- リスト情報編集 --- */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={"text-xl font-semibold text-foreground"}>
                {sentimentLabel}
              </span>
              <Input
                value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ランキングのテーマ"
                className={"text-xl font-semibold flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-none p-0 h-auto text-foreground"}
                maxLength={50}
              />
            </div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="リストの説明（任意）" rows={2} maxLength={500} className="border-muted focus-visible:ring-1 focus-visible:ring-ring" />
          </CardHeader>
        </Card>

        {/* --- アイテム一覧 & 編集 --- */}
        {/* ★★★ Card自体にスクロールと高さ制限を適用 ★★★ */}
        <Card className="max-h-[60vh] overflow-y-auto pr-3"> {/* 高さを 60vh に変更（調整可） */}
          <CardContent className="pt-6 space-y-3"> {/* Headerがない分、少しpadding-topを追加 */}
            {editableItems.length === 0 && (
               <p className="text-muted-foreground px-3">下の「+」ボタンでアイテムを追加してください。</p>
            )}
            {/* SortableContext でラップ */}
            <SortableContext items={editableItems.map(item => item.clientId)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
                {editableItems.map((item, index) => (
                   <SortableRankedItem
                      key={item.clientId}
                      item={item}
                      index={index}
                      handleItemChange={handleItemChange}
                      handleDeleteItem={handleDeleteItem}
                      isSaving={isSaving}
                    />
                ))}
              </ul>
            </SortableContext>
            {/* アイテム追加ボタン */}
            {editableItems.length < 10 && (
              <div className="pt-3"> {/* ボタンの上に少しスペース */}
                  <Button variant="outline" size="sm" onClick={handleAddItemSlot} disabled={isSaving}>
                     <PlusIcon className="h-4 w-4 mr-2" />
                     アイテムを追加 ({editableItems.length + 1}位)
                  </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* --- 保存ボタン & 削除ボタン --- */}
      {/* ↓ justify-between を削除し、右寄せにする (例: justify-end) */}
      <div className="flex justify-end items-center space-x-2 pt-4 border-t">
          {/* 削除ボタン (フォームでラップ) - order-last などで右端にすることも可能 */}
          <form action={deleteFormAction} onSubmit={handleDeleteConfirm}>
              <input type="hidden" name="listId" value={rankingList.id} />
              <Button type="submit" variant="destructive" disabled={isSaving}>
                  リストを削除
              </Button>
              {/* 削除エラー表示 */}
              {deleteState?.error && (
                  <p className="text-sm text-red-500 mt-1">{deleteState.error}</p>
              )}
          </form>

          {/* 保存ボタン群 (順番はそのまま) */}
          <Button variant="outline" onClick={() => handleSave(ListStatus.DRAFT)} disabled={isSaving}>
             {isSaving ? '保存中...' : '下書き保存'}
          </Button>
          <Button onClick={() => handleSave(ListStatus.PUBLISHED)} disabled={isSaving}>
             {isSaving ? '保存中...' : '公開して保存'}
          </Button>
      </div>
      </div>
    </DndContext>
  );
}

interface SortableRankedItemProps {
  item: EditableItem;
  index: number;
  handleItemChange: (index: number, field: keyof Omit<EditableItem, 'clientId' | 'id'>, value: string | null) => void;
  handleDeleteItem: (index: number) => void;
  isSaving: boolean;
}

// 各アイテムを表示・ドラッグ可能にするためのコンポーネント
function SortableRankedItem({ item, index, handleItemChange, handleDeleteItem, isSaving }:  SortableRankedItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };

  return (
    <li ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 p-3 bg-secondary rounded relative">
       {/* ドラッグハンドル */}
       <button {...listeners} className="cursor-grab touch-none p-1 -ml-1" title="ドラッグして並び替え" type="button"> {/* 少し左に調整 */}
           <GripVertical className="h-5 w-5 text-muted-foreground" />
       </button>
       {/* ★★★ 順位表示を修正 ★★★ */}
       <span className="font-semibold w-8 text-center text-muted-foreground whitespace-nowrap">{`${index + 1}位`}</span>
       {/* アイテム入力部分 */}
       <div className="flex-1 space-y-1">
         <Input value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} placeholder={`${index + 1}位のアイテム名`} maxLength={100} className="bg-background" />
         <Textarea value={item.itemDescription ?? ""} onChange={(e) => handleItemChange(index, 'itemDescription', e.target.value)} placeholder="アイテムの説明・コメント（任意）" rows={1} maxLength={500} className="text-sm bg-background" />
       </div>
       {/* 削除ボタン */}
       <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(index)} title="アイテム削除" disabled={isSaving}>
         <TrashIcon className="h-4 w-4 text-muted-foreground" />
       </Button>
    </li>
  );
}

