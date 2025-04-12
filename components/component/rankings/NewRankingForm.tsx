// components/component/rankings/NewRankingForm.tsx
"use client";

import { useState, useEffect, useCallback, SVGProps } from "react";
import { useRouter } from "next/navigation"; // 成功後のリダイレクト用
import { Prisma, Sentiment, ListStatus } from "@prisma/client";
import { z } from "zod"; // バリデーション用
import { useToast } from "@/components/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusIcon,
  TrashIcon,
  GripVertical,
} from "@/components/component/Icons"; // アイコンをインポート (パス確認)
import { createCompleteRankingAction } from '@/lib/actions/rankingActions';

// dnd-kit のインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- 型定義 ---
// 編集中のアイテムの型 (RankingListEditView から流用)
interface EditableItem {
  clientId: string; // DnD と State 管理用のクライアント側 ID
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null; // 画像機能はまだだがフィールドは用意
}

// Server Action の戻り値の型 (仮)
type CreateCompleteRankingResult = {
  success: boolean;
  error?: string;
  newListId?: string; // 成功時に新しいリストIDを返す場合
};

// --- Zod スキーマ (rankingActions から流用) ---
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "テーマを入力してください。")
  .max(50, "テーマは50字以内で入力してください。")
  .regex(subjectAllowedCharsRegex, {
    message: "テーマには日本語、英数字、半角スペースのみ使用できます。",
  });
const ItemNameSchema = z
  .string()
  .trim()
  .min(1, "アイテム名は必須です。")
  .max(100, "アイテム名は100字以内です。");
const DescriptionSchema = z
  .string()
  .trim()
  .max(500, "説明は500字以内です。")
  .optional(); // Textarea の maxLengt と合わせる

// --- フォームコンポーネント本体 ---
export function NewRankingForm() {
  const router = useRouter();
  const { toast } = useToast();

  // --- 状態管理 ---
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // フォーム全体のエラー

  // --- アイテム操作ハンドラ (RankingListEditView から流用) ---
  const handleAddItemSlot = () => {
    if (editableItems.length < 10) {
      const newClientId = `new-${Date.now()}-${Math.random()}`;
      setEditableItems([
        ...editableItems,
        {
          clientId: newClientId,
          itemName: "",
          itemDescription: null,
          imageUrl: null,
        },
      ]);
    } else {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
    }
  };

  const handleItemChange = (
    clientId: string,
    field: keyof Omit<EditableItem, "clientId">,
    value: string | null
  ) => {
    setEditableItems((currentItems) =>
      currentItems.map((item) =>
        item.clientId === clientId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDeleteItem = (clientId: string) => {
    setEditableItems((currentItems) =>
      currentItems.filter((item) => item.clientId !== clientId)
    );
  };

  // --- DnD 用設定 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems((items) => {
        const oldIndex = items.findIndex((item) => item.clientId === active.id);
        const newIndex = items.findIndex((item) => item.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []); // items は依存しない (関数型更新のため)

  // --- 保存処理ハンドラ ---
  const handleSave = async (status: ListStatus) => {
    setIsSubmitting(true);
    setFormError(null); // エラーをリセット

    // --- クライアントサイドバリデーション (最低限) ---
    if (!sentiment) {
      setFormError("ランキングの種類を選択してください。");
      setIsSubmitting(false);
      return;
    }
    try {
      SubjectSchema.parse(subject);
    } catch (e) {
      if (e instanceof z.ZodError) setFormError(e.errors[0].message);
      setIsSubmitting(false);
      return;
    }
    try {
      DescriptionSchema.parse(description);
    } catch (e) {
      if (e instanceof z.ZodError) setFormError(e.errors[0].message);
      setIsSubmitting(false);
      return;
    }
    if (status === ListStatus.PUBLISHED && editableItems.length === 0) {
      setFormError("公開するにはアイテムを1つ以上登録してください。");
      setIsSubmitting(false);
      return;
    }
    for (let i = 0; i < editableItems.length; i++) {
      try {
        ItemNameSchema.parse(editableItems[i].itemName);
      } catch (e) {
        if (e instanceof z.ZodError)
          setFormError(`${i + 1}番目のアイテム: ${e.errors[0].message}`);
        setIsSubmitting(false);
        return;
      }
      try {
        DescriptionSchema.parse(editableItems[i].itemDescription ?? "");
      } catch (e) {
        if (e instanceof z.ZodError)
          setFormError(`${i + 1}番目のアイテム説明: ${e.errors[0].message}`);
        setIsSubmitting(false);
        return;
      }
      // TODO: imageUrl のバリデーション
    }
    // --- バリデーションここまで ---

    // Server Action に渡すデータを作成
    const rankingData = { sentiment, subject, description };
    const itemsData = editableItems.map(({ clientId, ...rest }) => rest); // clientIdを除外

    console.log("Saving ranking with:", { rankingData, itemsData, status });

    try {
      // ★ Server Action を呼び出す ★
      const result = await createCompleteRankingAction(rankingData, itemsData, status);

      // ★ 結果ハンドリング ★
      if (result.success && result.newListId) {
        toast({ title: status === ListStatus.DRAFT ? "下書きを保存しました。" : "ランキングを作成・公開しました。" });
        // 成功したら作成されたランキングページに遷移
        router.push(`/rankings/${result.newListId}`);
        // フォームをリセットするなどの処理もここに追加可能
      } else {
        // Server Action 側でエラーが返された場合
        setFormError(result.error || "保存中に不明なエラーが発生しました。");
        toast({ title: "保存エラー", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      // Server Action 呼び出し自体でエラーが発生した場合
      console.error("Error saving ranking:", error);
      const message = error instanceof Error ? error.message : "保存中に予期せぬエラーが発生しました。";
      setFormError(message);
      toast({ title: "エラー", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false); // ローディング解除
    }
  };

  return (
    // DnDContext でラップ
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className='space-y-6'>
        {/* --- 基本情報入力 (Card で囲む) --- */}
        <Card>
          <CardHeader>
            <CardTitle>ランキング基本情報</CardTitle>
            <CardDescription>
              ランキングの種類、テーマ、説明を入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* 種類選択 (RankingListForm から流用) */}
            <div>
              <Label htmlFor='sentiment'>
                ランキングの種類 <span className='text-red-500'>*</span>
              </Label>
              <Select
                name='sentiment'
                required
                value={sentiment ?? ""}
                onValueChange={(value) => setSentiment(value as Sentiment)}
              >
                <SelectTrigger id='sentiment'>
                  <SelectValue placeholder='種類を選択...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Sentiment.LIKE}>好き</SelectItem>
                  <SelectItem value={Sentiment.DISLIKE}>嫌い</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* テーマ入力 (RankingListForm から流用) */}
            <div>
              <Label htmlFor='subject'>
                テーマ（〇〇の部分）<span className='text-red-500'>*</span>
              </Label>
              <Input
                id='subject'
                name='subject'
                type='text'
                placeholder='例: 作業用BGM'
                required
                maxLength={50}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            {/* 説明入力 (RankingListForm から流用) */}
            <div>
              <Label htmlFor='description'>リストの説明（任意）</Label>
              <Textarea
                id='description'
                name='description'
                placeholder='このランキングについての簡単な説明'
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        {/* --- アイテム編集 (Card で囲む) --- */}
        <Card>
          <CardHeader>
            <CardTitle>ランキングアイテム</CardTitle>
            <CardDescription>
              アイテムを追加・編集・並び替えしてください。(ドラッグ＆ドロップで並び替え)
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-0 space-y-3'>
            {" "}
            {/* pt-0 に変更 */}
            {editableItems.length === 0 && (
              <p className='text-muted-foreground text-sm px-3 py-2'>
                下の「+」ボタンでアイテムを追加してください。
              </p>
            )}
            {/* SortableContext でラップ */}
            <SortableContext
              items={editableItems.map((item) => item.clientId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className='space-y-3'>
                {editableItems.map((item, index) => (
                  // ★ アイテム編集用コンポーネント ★
                  <EditableRankedItem
                    key={item.clientId}
                    clientId={item.clientId} // useSortable の id と合わせる
                    item={item}
                    index={index}
                    handleItemChange={handleItemChange}
                    handleDeleteItem={handleDeleteItem}
                    isSaving={isSubmitting} // isSubmitting を渡す
                  />
                ))}
              </ul>
            </SortableContext>
            {/* アイテム追加ボタン */}
            {editableItems.length < 10 && (
              <div className='pt-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleAddItemSlot}
                  disabled={isSubmitting}
                >
                  <PlusIcon className='h-4 w-4 mr-2' />
                  アイテムを追加 ({editableItems.length + 1}位)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- フォーム全体のエラー表示 --- */}
        {formError && <p className='text-sm text-red-500'>{formError}</p>}

        {/* --- 保存ボタン --- */}
        <div className='flex justify-end items-center space-x-2 pt-4 border-t'>
          <Button
            variant='outline'
            onClick={() => handleSave(ListStatus.DRAFT)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : "下書き保存"}
          </Button>
          <Button
            onClick={() => handleSave(ListStatus.PUBLISHED)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "作成中..." : "公開して作成"}
          </Button>
        </div>
      </div>
    </DndContext>
  );
}

// --- ★ アイテム編集用コンポーネント (SortableRankedItem を流用・改変) ★ ---
interface EditableRankedItemProps {
  clientId: string; // DnD 用の ID
  item: EditableItem; // 表示・編集するアイテムデータ
  index: number;
  handleItemChange: (
    clientId: string,
    field: keyof Omit<EditableItem, "clientId" | "id">,
    value: string | null
  ) => void;
  handleDeleteItem: (clientId: string) => void;
  isSaving: boolean;
}

function EditableRankedItem({
  clientId,
  item,
  index,
  handleItemChange,
  handleDeleteItem,
  isSaving,
}: EditableRankedItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clientId }); // props の clientId を使う
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className='flex items-start gap-2 p-3 bg-secondary rounded relative'
    >
      {" "}
      {/* items-start に変更 */}
      {/* ドラッグハンドル */}
      <button
        {...listeners}
        className='cursor-grab touch-none p-1 mt-1'
        title='ドラッグして並び替え'
        type='button'
      >
        {" "}
        {/* mt-1 で少し下げる */}
        <GripVertical className='h-5 w-5 text-muted-foreground' />
      </button>
      {/* 順位表示 */}
      <span className='font-semibold w-8 text-center text-muted-foreground pt-1'>{`${
        index + 1
      }位`}</span>
      {/* アイテム入力部分 */}
      <div className='flex-1 space-y-1'>
        <Input
          value={item.itemName}
          onChange={(e) =>
            handleItemChange(clientId, "itemName", e.target.value)
          }
          placeholder={`${index + 1}位のアイテム名`}
          maxLength={100}
          className='bg-background'
          required // 必須マーク (見た目だけ)
          disabled={isSaving}
        />
        <Textarea
          value={item.itemDescription ?? ""}
          onChange={(e) =>
            handleItemChange(clientId, "itemDescription", e.target.value)
          }
          placeholder='アイテムの説明・コメント（任意）'
          rows={2} // 少し高さを出す
          maxLength={500}
          className='text-sm bg-background'
          disabled={isSaving}
        />
        {/* TODO: 画像アップロード機能 */}
      </div>
      {/* 削除ボタン */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => handleDeleteItem(clientId)}
        title='アイテム削除'
        disabled={isSaving}
        className='mt-1'
      >
        {" "}
        {/* mt-1 で少し下げる */}
        <TrashIcon className='h-4 w-4 text-muted-foreground hover:text-destructive' />
      </Button>
    </li>
  );
}

// ★ TrashIcon を components/Icons.tsx に追加する必要あり ★
// 例: Lucide Icons から
// <svg ...>
//   <path d="M3 6h18" />
//   <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
//   <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
// </svg>
