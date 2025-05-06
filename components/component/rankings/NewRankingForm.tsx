"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListStatus } from "@prisma/client";
import { z } from "zod";
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
import { PlusIcon, Loader2 } from "@/components/component/Icons";
import { createCompleteRankingAction } from "@/lib/actions/rankingActions";
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
} from "@dnd-kit/sortable";
import { EditableRankedItem, type EditableItem } from "./EditableRankedItem";
import TagInput from "./TagInput";

// --- Zodスキーマ ---
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "テーマを入力してください。")
  .max(50, "テーマは50字以内")
  .regex(subjectAllowedCharsRegex, {
    message: "タイトルに使用できない文字です。",
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
  .optional();
const TagNameSchema = z
  .string()
  .trim()
  .min(1, "タグ名は1文字以上入力してください。")
  .max(30, "タグ名は30文字以内です。");

export function NewRankingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // アイテム追加
  const handleAddItemSlot = useCallback(() => {
    if (editableItems.length < 10) {
      const newClientId = `new-${Date.now()}-${Math.random()}`;
      setEditableItems((prev) => [
        ...prev,
        {
          clientId: newClientId,
          itemName: "",
          itemDescription: null,
          imageUrl: null,
          imageFile: null,
          previewUrl: null,
        },
      ]);
    } else {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
    }
  }, [editableItems.length, toast]);

  // アイテム内容変更
  const handleItemChange = useCallback(
    (
      clientId: string,
      field: keyof Omit<
        EditableItem,
        "clientId" | "id" | "imageFile" | "previewUrl" | "imageUrl"
      >,
      value: string | null
    ) => {
      setEditableItems((items) =>
        items.map((item) =>
          item.clientId === clientId ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // アイテム削除
  const handleDeleteItem = useCallback(
    (clientId: string) => {
      const toDelete = editableItems.find((i) => i.clientId === clientId);
      if (toDelete?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(toDelete.previewUrl);
      }
      setEditableItems((items) =>
        items.filter((item) => item.clientId !== clientId)
      );
    },
    [editableItems]
  );

  // アイテム画像変更
  const handleItemImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((items) =>
        items.map((item) => {
          if (item.clientId === clientId) {
            if (item.previewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(item.previewUrl);
            }
            const previewUrl = file ? URL.createObjectURL(file) : null;
            return { ...item, imageFile: file, previewUrl };
          }
          return item;
        })
      );
    },
    []
  );

  // DnD kit センサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ドラッグ完了時に順序入れ替え
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems((items) => {
        const oldIndex = items.findIndex((i) => i.clientId === active.id);
        const newIndex = items.findIndex((i) => i.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // 保存処理
  const handleSave = async (status: ListStatus) => {
    startSubmitTransition(async () => {
      setFormError(null);

      // バリデーション
      try {
        SubjectSchema.parse(subject);
      } catch (e) {
        if (e instanceof z.ZodError) {
          setFormError(e.errors[0].message);
          return;
        }
      }
      try {
        DescriptionSchema.parse(description);
      } catch (e) {
        if (e instanceof z.ZodError) {
          setFormError(e.errors[0].message);
          return;
        }
      }
      if (status === ListStatus.PUBLISHED && editableItems.length === 0) {
        setFormError("公開にはアイテムを1つ以上登録してください。");
        return;
      }
      try {
        if (tags.length > 5) throw new Error("タグは5個までです。");
        tags.forEach((t) => TagNameSchema.parse(t));
      } catch (e) {
        if (e instanceof z.ZodError) {
          setFormError(`タグ: ${e.errors[0].message}`);
        } else if (e instanceof Error) {
          setFormError(e.message);
        }
        return;
      }
      // アイテム個別バリデーション
      for (let i = 0; i < editableItems.length; i++) {
        const item = editableItems[i];
        try {
          ItemNameSchema.parse(item.itemName);
        } catch (e) {
          if (e instanceof z.ZodError) {
            setFormError(`${i + 1}番目: ${e.errors[0].message}`);
            return;
          }
        }
        try {
          DescriptionSchema.parse(item.itemDescription ?? "");
        } catch (e) {
          if (e instanceof z.ZodError) {
            setFormError(`${i + 1}番目説明: ${e.errors[0].message}`);
            return;
          }
        }
      }

      // サーバーに渡すデータ
      const rankingData = { subject, description, tags };
      const itemsData = editableItems.map((item) => ({
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        imageUrl: item.previewUrl ?? null,
      }));

      const result = await createCompleteRankingAction(
        rankingData,
        itemsData,
        status
      );
      if (result.success) {
        toast({
          title:
            status === ListStatus.DRAFT ? "下書き保存しました。" : "作成・公開しました。",
        });
        router.push(`/rankings/${result.newListId}`);
      } else {
        setFormError(result.error || "保存中にエラーが発生しました。");
        toast({
          title: "保存エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>ランキング基本情報</CardTitle>
            <CardDescription>
              テーマ、説明、タグを設定します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">テーマ*</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="tags">タグ（任意, 5個まで）</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="タグを追加"
                maxTags={5}
                maxLength={30}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* アイテム編集 */}
        <Card>
          <CardHeader>
            <CardTitle>ランキングアイテム</CardTitle>
            <CardDescription>
              アイテムを追加・編集・並び替えしてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {editableItems.length === 0 && (
              <p className="text-muted-foreground px-3">
                「＋」ボタンでアイテムを追加できます。
              </p>
            )}
            <SortableContext
              items={editableItems.map((i) => i.clientId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {editableItems.map((item, idx) => (
                  <EditableRankedItem
                    key={item.clientId}
                    clientId={item.clientId}
                    item={item}
                    index={idx}
                    handleItemChange={handleItemChange}
                    handleDeleteItem={handleDeleteItem}
                    handleItemImageChange={handleItemImageChange}
                    isSaving={isSubmitting}
                  />
                ))}
              </ul>
            </SortableContext>
            {editableItems.length < 10 && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItemSlot}
                  disabled={isSubmitting}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  アイテムを追加 ({editableItems.length + 1}位)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {formError && (
          <p className="text-sm text-red-500 px-1">{formError}</p>
        )}

        {/* 保存ボタン */}
        <div className="flex justify-end items-center space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleSave(ListStatus.DRAFT)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isSubmitting ? "保存中…" : "下書き保存"}
          </Button>
          <Button
            onClick={() => handleSave(ListStatus.PUBLISHED)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isSubmitting ? "公開中…" : "保存して公開"}
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
