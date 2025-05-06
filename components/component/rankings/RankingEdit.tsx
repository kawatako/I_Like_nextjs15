"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ListStatus } from "@prisma/client";
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
import TagInput from "./TagInput";
import { saveRankingListItemsAction } from "@/lib/actions/rankingActions";
import { PlusIcon } from "@/components/component/Icons";

interface Props {
  rankingList: {
    id: string;
    subject: string;
    description: string | null;
    items: {
      id: string;
      itemName: string;
      itemDescription: string | null;
      imageUrl: string | null;
    }[];
    tags: { name: string }[];
  };
}

export function RankingEdit({ rankingList }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [subject, setSubject] = useState(rankingList.subject);
  const [description, setDescription] = useState(
    rankingList.description ?? ""
  );
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    rankingList.items.map((item) => ({
      clientId: item.id,
      id: item.id,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageUrl: item.imageUrl,
      imageFile: null,
      previewUrl: item.imageUrl,
    }))
  );
  const [tags, setTags] = useState<string[]>(
    rankingList.tags.map((t) => t.name)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleItemChange = useCallback(
    (
      clientId: string,
      field: keyof Omit<
        EditableItem,
        | "clientId"
        | "id"
        | "imageFile"
        | "previewUrl"
        | "imageUrl"
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

  const handleItemImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((items) =>
        items.map((item) => {
          if (item.clientId === clientId) {
            if (item.previewUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(item.previewUrl);
            }
            const previewUrl = file ? URL.createObjectURL(file) : item.imageUrl;
            return { ...item, imageFile: file, previewUrl };
          }
          return item;
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
        const oldIndex = items.findIndex((i) => i.clientId === active.id);
        const newIndex = items.findIndex((i) => i.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleSave = async (status: ListStatus) => {
    startSaveTransition(async () => {
      setFormError(null);
      // (バリデーションは省略)

      // サーバーに渡すデータ
      const itemsData = editableItems.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        imageUrl: item.previewUrl ?? null,
      }));

      // listImageUrl は完全に削除したので null を渡す
      const result = await saveRankingListItemsAction(
        rankingList.id,
        itemsData,
        subject,
        description,
        /* listImageUrl */ null,
        tags,
        status
      );

      if (result.success) {
        toast({
          title:
            status === ListStatus.DRAFT
              ? "下書きを保存しました。"
              : "公開更新しました。",
        });
        router.push(`/rankings/${rankingList.id}`);
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

  if (!isMounted) {
    return <div className="p-4 text-center">読み込み中…</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* 基本情報カード */}
        <Card>
          <CardHeader>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSaving}
              className="text-xl font-semibold"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={2}
              className="mt-2"
            />
            <div className="mt-4">
              <Label htmlFor="tags">タグ（任意, 5個まで）</Label>
              <TagInput value={tags} onChange={setTags} disabled={isSaving} />
            </div>
          </CardHeader>
        </Card>

        {/* アイテム編集カード */}
        <Card className="max-h-[60vh] overflow-y-auto pr-3">
          <CardHeader>
            <CardTitle>ランキングアイテム</CardTitle>
            <CardDescription>
              アイテムを追加・編集・並び替えしてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {editableItems.length === 0 && (
              <p className="text-muted-foreground px-3">
                下の「+」ボタンでアイテムを追加
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
                    isSaving={isSaving}
                  />
                ))}
              </ul>
            </SortableContext>
            <div className="pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItemSlot}
                disabled={isSaving}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                アイテムを追加 ({editableItems.length + 1}位)
              </Button>
            </div>
          </CardContent>
        </Card>

        {formError && (
          <p className="text-sm text-red-500 px-1">{formError}</p>
        )}

        {/* 保存／公開ボタン */}
        <div className="flex justify-end items-center space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleSave(ListStatus.DRAFT)}
            disabled={isSaving}
          >
            下書き保存
          </Button>
          <Button
            onClick={() => handleSave(ListStatus.PUBLISHED)}
            disabled={isSaving}
          >
            更新して公開
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
