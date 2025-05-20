// components/rankings/RankingEdit.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ListStatus } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { Combobox } from "@headlessui/react";
import { ChevronsUpDown } from "lucide-react";
import { useSubjectSuggestions } from "@/lib/hooks/useSubjectSuggestions";
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
import { saveRankingListItemsAction } from "@/lib/actions/rankingActions";
import { useImageUploader } from "@/lib/hooks/useImageUploader";

interface Props {
  rankingList: {
    id: string;
    subject: string;
    description: string | null;
    items: {
      id: string;
      itemName: string;
      itemDescription: string | null;
      imageUrl: string | null;  // 署名付きURL
      imagePath: string | null; // 元のキー文字列
    }[];
    rankingListTags: { tag: { id: string; name: string } }[];
  };
}

export function RankingEdit({ rankingList }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { uploadImage, isLoading: isUploading } = useImageUploader();
  const [isSaving, startSaveTransition] = useTransition();

  // --- サジェスト用 state ---
  const [subject, setSubject] = useState(rankingList.subject);
  const [subjectQuery, setSubjectQuery] = useState(rankingList.subject);
  const {
    options: subjectOptions,
    isLoading: isSubjectLoading,
  } = useSubjectSuggestions(subjectQuery);

  const [description, setDescription] = useState(
    rankingList.description ?? ""
  );
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    rankingList.items.map((item) => ({
      clientId: item.id,
      id: item.id,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageFile: null,
      previewUrl: item.imageUrl ?? null,
      imagePath: item.imagePath,
    }))
  );
  const [tags, setTags] = useState<string[]>(
    rankingList.rankingListTags.map((t) => t.tag.name)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        imageFile: null,
        previewUrl: null,
        imagePath: null,
      },
    ]);
  }, [editableItems.length, toast]);

  const handleItemChange = useCallback(
    (
      clientId: string,
      field: keyof Omit<
        EditableItem,
        "clientId" | "id" | "imageFile" | "previewUrl" | "imagePath"
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

  const handleDeleteItem = useCallback((clientId: string) => {
    setEditableItems((items) =>
      items.filter((item) => item.clientId !== clientId)
    );
  }, []);

  const handleItemImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((items) =>
        items.map((item) => {
          if (item.clientId !== clientId) return item;
          if (item.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
          }
          if (file) {
            const previewUrl = URL.createObjectURL(file);
            return { ...item, imageFile: file, previewUrl, imagePath: null };
          } else {
            return {
              ...item,
              imageFile: null,
              previewUrl: null,
              imagePath: null,
            };
          }
        })
      );
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems((items) => {
        const oldIdx = items.findIndex((i) => i.clientId === active.id);
        const newIdx = items.findIndex((i) => i.clientId === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  }, []);

  const handleSave = async (status: ListStatus) => {
    startSaveTransition(async () => {
      setFormError(null);
      try {
        // 1) アイテム副本
        const items = [...editableItems];

        // 2) 画像アップロードマッピング
        const uploadResults = await Promise.all(
          items.map(async (item) => {
            if (item.imageFile) {
              const res = await uploadImage(item.imageFile);
              if (!res) throw new Error("画像アップロードに失敗しました");
              return { clientId: item.clientId, path: res.path };
            }
            return null;
          })
        );
        const uploadMap = new Map(
          uploadResults
            .filter((r): r is { clientId: string; path: string } => !!r)
            .map((r) => [r.clientId, r.path])
        );

        // 3) 保存データ組立
        const itemsData = items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          imageUrl:
            uploadMap.get(item.clientId) ?? item.imagePath ?? null,
        }));

        // 4) サーバーアクション呼び出し
        const result = await saveRankingListItemsAction(
          rankingList.id,
          itemsData,
          subject,
          description,
          null,
          tags,
          status
        );
        if (!result.success)
          throw new Error(result.error || "保存に失敗しました");

        toast({
          title:
            status === "DRAFT"
              ? "下書きを保存しました"
              : "公開更新しました",
        });
        router.push(`/rankings/${rankingList.id}`);
      } catch (err: any) {
        setFormError(err.message);
        toast({
          title: "エラー",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  if (!isMounted) return <div className="p-4 text-center">読み込み中…</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* ─── タイトル & 説明 編集フォーム ─── */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">ランキング情報</h3>
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
                    disabled={isSaving || isUploading}
                    maxLength={50}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
                  </Combobox.Button>
                  <Combobox.Options className="absolute z-10 mt-1 w-full bg-popover shadow-md max-h-60 overflow-auto rounded-md">
                    {isSubjectLoading && (
                      <div className="p-2">読み込み中…</div>
                    )}
                    {!isSubjectLoading && subjectOptions.length === 0 && (
                      <div className="p-2 text-muted-foreground">
                        該当なし
                      </div>
                    )}
                    {subjectOptions.map((opt) => (
                      <Combobox.Option
                        key={opt}
                        value={opt}
                        className={({ active }) =>
                          `cursor-pointer select-none p-2 ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : ""
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
                disabled={isSaving || isUploading}
                maxLength={500}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── アイテム編集部分 ─── */}
        <Card className="max-h-[60vh] overflow-y-auto pr-3">
          <CardHeader>ランキングアイテム</CardHeader>
          <CardContent className="pt-0 space-y-3">
            {editableItems.length === 0 && (
              <p>「+ アイテム追加」ボタンでアイテムを追加できます。</p>
            )}
            <SortableContext
              items={editableItems.map((i) => i.clientId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {editableItems.map((item, idx) => (
                  <EditableRankedItem
                    key={item.clientId}
                    subject={subject}
                    clientId={item.clientId}
                    item={item}
                    index={idx}
                    handleItemChange={handleItemChange}
                    handleDeleteItem={handleDeleteItem}
                    handleItemImageChange={handleItemImageChange}
                    isSaving={isSaving || isUploading}
                  />
                ))}
              </ul>
            </SortableContext>
            <Button
              onClick={handleAddItemSlot}
              disabled={isSaving || isUploading}
            >
              + アイテム追加
            </Button>
          </CardContent>
        </Card>

        {formError && (
          <p className="text-red-600 px-1">{formError}</p>
        )}

        {/* ─── 保存ボタン ─── */}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => handleSave("DRAFT")}
            disabled={isSaving || isUploading}
          >
            下書き保存
          </Button>
          <Button
            onClick={() => handleSave("PUBLISHED")}
            disabled={isSaving || isUploading}
          >
            保存して公開
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
