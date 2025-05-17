// components/component/rankings/RankingEdit.tsx
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/hooks/use-toast";
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
import { useImageUploader } from "@/components/hooks/useImageUploader";


interface Props {
  rankingList: {
    id: string;
    subject: string;
    description: string | null;
    items: {
      id: string;
      itemName: string;
      itemDescription: string | null;
      imageUrl: string | null; // 署名付きURL
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

  const [subject, setSubject] = useState(rankingList.subject);
  const [description, setDescription] = useState(rankingList.description ?? "");
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    rankingList.items.map((item) => ({
      clientId: item.id,
      id: item.id,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageFile: null,
      previewUrl: item.imageUrl,
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
        // 1) 編集中アイテムをクローン
        const items = [...editableItems];

        // 2) 新規アップロード分だけ順次アップロードし、clientId→path マップを作成
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

        // 3) 保存用データを組み立てる
        const itemsData = items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          // 新規アップロードがあればそのパス、それ以外は既存 path
          imageUrl: uploadMap.get(item.clientId) ?? item.imagePath ?? null,
        }));

        // 4) DB に保存
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
            status === "DRAFT" ? "下書きを保存しました" : "公開更新しました",
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

  if (!isMounted) return <div className='p-4 text-center'>読み込み中…</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className='space-y-6'>
        {/* ─── タイトル & 説明 編集フォーム ─── */}
        <Card>
          <CardHeader>
            <h3 className='text-lg font-semibold'>ランキング情報</h3>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='subject'>タイトル*</Label>
              <Input
                id='subject'
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSaving || isUploading}
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor='description'>説明（任意）</Label>
              <Textarea
                id='description'
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
        <Card className='max-h-[60vh] overflow-y-auto pr-3'>
          <CardHeader>ランキングアイテム</CardHeader>
          <CardContent className='pt-0 space-y-3'>
            {editableItems.length === 0 && (
              <p>下の「+ アイテム追加」ボタンでアイテムを追加できます。</p>
            )}
            <SortableContext
              items={editableItems.map((i) => i.clientId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className='space-y-3'>
                {editableItems.map((item, idx) => (
                  <EditableRankedItem
                    key={item.clientId}
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

        {formError && <p className='text-red-600 px-1'>{formError}</p>}

        {/* ─── 保存ボタン ─── */}
        <div className='flex justify-end space-x-2'>
          <Button
            variant='outline'
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
