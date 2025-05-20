//components/rankings/NewRankingForm.tsx
"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListStatus } from "@/lib/types";
import { z } from "zod";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "@/components/Icons";
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
import { useImageUploader } from "@/lib/hooks/useImageUploader";
import { Combobox } from "@headlessui/react";
import { ChevronsUpDown } from "lucide-react";
import { useSubjectSuggestions } from "@/lib/hooks/useSubjectSuggestions";

// --- Zod schemas ---
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
  const { uploadImage, isLoading: isUploading } = useImageUploader();
  const [subject, setSubject] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");
  const { options: subjectOptions, isLoading: isSubjectLoading } =useSubjectSuggestions(subjectQuery);
  const [description, setDescription] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Add blank item slot
  const handleAddItemSlot = useCallback(() => {
    if (editableItems.length >= 10) {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
      return;
    }
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
  }, [editableItems.length, toast]);

  // Field updates
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
  // Remove item
  const handleDeleteItem = useCallback(
    (clientId: string) => {
      const toDelete = editableItems.find((i) => i.clientId === clientId);
      if (toDelete?.previewUrl?.startsWith("blob:"))
        URL.revokeObjectURL(toDelete.previewUrl);
      setEditableItems((items) =>
        items.filter((item) => item.clientId !== clientId)
      );
    },
    [editableItems]
  );
  // Change image file & preview
  const handleItemImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((items) =>
        items.map((item) => {
          if (item.clientId === clientId) {
            if (item.previewUrl?.startsWith("blob:"))
              URL.revokeObjectURL(item.previewUrl);
            const previewUrl = file ? URL.createObjectURL(file) : null;
            return { ...item, imageFile: file, previewUrl };
          }
          return item;
        })
      );
    },
    []
  );

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
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

  // Save handler
  const handleSave = (status: ListStatus) => {
    startSubmitTransition(async () => {
      setFormError(null);

      // 1) Validate form-level
      try {
        SubjectSchema.parse(subject);
        DescriptionSchema.parse(description);
        if (status === "PUBLISHED" && editableItems.length === 0) {
          throw new Error("公開にはアイテムを1つ以上登録してください。");
        }
        if (tags.length > 5) throw new Error("タグは5個までです。");
        tags.forEach((t) => TagNameSchema.parse(t));
      } catch (e) {
        const msg =
          e instanceof z.ZodError ? e.errors[0].message : (e as Error).message;
        setFormError(msg);
        return;
      }

      // 2) Validate each item
      for (let i = 0; i < editableItems.length; i++) {
        const item = editableItems[i];
        if (!item.itemName.trim()) {
          setFormError(`${i + 1}番目: アイテム名は必須です。`);
          return;
        }
        if ((item.itemDescription ?? "").length > 500) {
          setFormError(`${i + 1}番目: 説明は500字以内です。`);
          return;
        }
      }

      // 3) Upload any new images
      let itemsData: {
        itemName: string;
        itemDescription?: string | null;
        imageUrl?: string | null;
      }[];
      try {
        itemsData = await Promise.all(
          editableItems.map(async (item) => {
            let finalUrl = item.imagePath ?? null;
            if (item.imageFile) {
              const uploaded = await uploadImage(item.imageFile);
              if (!uploaded)
                throw new Error("画像アップロードに失敗しました。");
              finalUrl = uploaded.path;
            }
            return {
              itemName: item.itemName.trim(),
              itemDescription: item.itemDescription?.trim() || null,
              imageUrl: finalUrl,
            };
          })
        );
      } catch (err) {
        toast({
          title: "アップロードエラー",
          description: err instanceof Error ? err.message : "不明なエラー",
          variant: "destructive",
        });
        return;
      }

      // 4) Call server action
      const rankingData = { subject, description, tags };
      const result = await createCompleteRankingAction(
        rankingData,
        itemsData,
        status
      );
      if (result.success && result.newListId) {
        toast({
          title:
            status === "DRAFT"
              ? "下書き保存しました。"
              : "作成・公開しました。",
        });
        router.push(`/rankings/${result.newListId}?share=1`);
      } else {
        const errMsg = result.error || "保存中にエラーが発生しました。";
        setFormError(errMsg);
        toast({
          title: "保存エラー",
          description: errMsg,
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
      {/* ─── 基本情報 ─── */}
      <Card>
        <CardHeader>
          <CardTitle>ランキング基本情報</CardTitle>
          <CardDescription>
            タイトル、説明、タグを設定します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subject">タイトル*</Label>
  <Combobox<string>
    value={subject}
    onChange={(val: string) => {
      setSubject(val);
      setSubjectQuery(val);
    }}
  >
    <div className="relative">
      <Combobox.Input
        id="subject"
        className="w-full bg-background"
        placeholder="タイトルを入力（3文字以上）"
        onChange={(e) => setSubjectQuery(e.target.value)}
        displayValue={(val: string) => val}
        value={subjectQuery}
        disabled={isSubmitting || isUploading}
        maxLength={50}
      />
      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
        <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
      </Combobox.Button>
      <Combobox.Options className="absolute z-10 mt-1 w-full bg-popover shadow-md max-h-60 overflow-auto rounded-md">
        {isSubjectLoading && <div className="p-2">読み込み中…</div>}
        {!isSubjectLoading && subjectOptions.length === 0 && (
          <div className="p-2 text-muted-foreground">該当なし</div>
        )}
        {subjectOptions.map((opt) => (
          <Combobox.Option
            key={opt}
            value={opt}
            className={({ active }) =>
              `cursor-pointer select-none p-2 ${
                active ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            {opt}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </div>
  </Combobox>
          </div>
          <div>
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isSubmitting || isUploading}
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
              disabled={isSubmitting || isUploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── アイテム ─── */}
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
                  subject={subject}
                  key={item.clientId}
                  clientId={item.clientId}
                  item={item}
                  index={idx}
                  handleItemChange={handleItemChange}
                  handleDeleteItem={handleDeleteItem}
                  handleItemImageChange={handleItemImageChange}
                  isSaving={isSubmitting || isUploading}
                />
              ))}
            </ul>
          </SortableContext>
          <div className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItemSlot}
              disabled={isSubmitting || isUploading}
            >
              <PlusIcon className="h-4 w-4 mr-2" /> アイテムを追加 (
              {editableItems.length + 1}位)
            </Button>
          </div>
        </CardContent>
      </Card>

      {formError && <p className="text-sm text-red-500 px-1">{formError}</p>}

      {/* ─── 保存ボタン ─── */}
      <div className="flex justify-end items-center space-x-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => handleSave("DRAFT")}
          disabled={isSubmitting || isUploading}
        >
          {(isSubmitting || isUploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}{" "}
          下書き保存
        </Button>
        <Button
          onClick={() => handleSave("PUBLISHED")}
          disabled={isSubmitting || isUploading}
        >
          {(isSubmitting || isUploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}{" "}
          保存して公開
        </Button>
      </div>
    </div>
  </DndContext>
);
}