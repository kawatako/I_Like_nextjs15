// components/rankings/RankingEdit.tsx
"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListStatus } from "@/lib/types";
import { useToast } from "@/lib/hooks/use-toast";
import { useSubjectSuggestions } from "@/lib/hooks/useSubjectSuggestions";
import { useImageUploader } from "@/lib/hooks/useImageUploader";
import { saveRankingListItemsAction } from "@/lib/actions/rankingActions";
import { validateRankingForm } from "@/lib/validation/rankings";
import { RankingBasicInfo } from "./common/RankingBasicInfo";
import { RankingItemsList } from "./common/RankingItemsList";
import { RankingFormActions } from "./common/RankingFormActions";
import { arrayMove } from "@dnd-kit/sortable";
import type { EditableItem } from "./common/EditableRankedItem";

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
      imagePath: string | null;
    }[];
    rankingListTags: { tag: { id: string; name: string } }[];
  };
}

export function RankingEdit({ rankingList }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { uploadImage, isLoading: isUploading } = useImageUploader();
  const [isSaving, startSaveTransition] = useTransition();

  // フックは常に同じ順序で
  const [isMounted, setIsMounted] = useState(false);
  const [subject, setSubject] = useState(rankingList.subject);
  const [subjectQuery, setSubjectQuery] = useState(rankingList.subject);
  const { options: subjectOptions, isLoading: isSubjectLoading } =
    useSubjectSuggestions(subjectQuery);
  const [description, setDescription] = useState(rankingList.description ?? "");
  const [tags, setTags] = useState<string[]>(
    rankingList.rankingListTags.map((t) => t.tag.name)
  );
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ① 新しいアイテムスロットを追加
  const handleAddItem = useCallback(() => {
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

  // ② 項目フィールド変更
  const handleItemChange = useCallback(
    (
      clientId: string,
      field: keyof Omit<EditableItem, "clientId" | "id" | "imageFile" | "previewUrl" | "imagePath">,
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

  // ③ 項目削除
  const handleDeleteItem = useCallback((clientId: string) => {
    setEditableItems((items) =>
      items.filter((item) => item.clientId !== clientId)
    );
  }, []);

  // ④ 画像変更／削除
  const handleImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((items) =>
        items.map((item) => {
          if (item.clientId !== clientId) return item;
          if (item.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
          }
          return {
            ...item,
            imageFile: file,
            previewUrl: file ? URL.createObjectURL(file) : null,
            imagePath: file ? null : item.imagePath,
          };
        })
      );
    },
    []
  );

  // ⑤ 並び替え
  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setEditableItems((items) => arrayMove(items, oldIndex, newIndex));
  }, []);

  // ⑥ 保存処理
  const handleSave = useCallback(
    (status: ListStatus) => {
      startSaveTransition(async () => {
        setFormError(null);

        // —— ① 共通バリデーション呼び出し ——
        const valError = validateRankingForm(
          subject,
          description,
          editableItems.map((it) => ({
            itemName: it.itemName,
            itemDescription: it.itemDescription,
          })),
          tags
        );
        if (valError) {
          setFormError(valError);
          return;
        }

        // —— ② 画像アップロード & マッピング ——
        try {
          const uploadResults = await Promise.all(
            editableItems.map(async (item) => {
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
          const itemsData = editableItems.map((item) => ({
            id: item.id,
            itemName: item.itemName.trim(),
            itemDescription: item.itemDescription?.trim() || null,
            imageUrl: uploadMap.get(item.clientId) ?? item.imagePath ?? null,
          }));

          // —— ③ サーバーアクション呼び出し ——
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
        } catch (e) {
          const msg = (e as Error).message;
          setFormError(msg);
          toast({ title: "エラー", description: msg, variant: "destructive" });
        }
      });
    },
    [
      subject,
      description,
      editableItems,
      tags,
      uploadImage,
      rankingList.id,
      toast,
      router,
    ]
  );

  return (
    <div className="space-y-6">
      {!isMounted ? (
        <div className="p-4 text-center">読み込み中…</div>
      ) : (
        <>
          <RankingBasicInfo
            subject={subject}
            subjectQuery={subjectQuery}
            onSubjectChange={setSubject}
            onSubjectQueryChange={setSubjectQuery}
            subjectOptions={subjectOptions}
            isSubjectLoading={isSubjectLoading}
            description={description}
            onDescriptionChange={setDescription}
            tags={tags}
            onTagsChange={setTags}
            disabled={isSaving || isUploading}
          />

          <RankingItemsList
            subject={subject}
            items={editableItems}
            onItemChange={handleItemChange}
            onDeleteItem={handleDeleteItem}
            onImageChange={handleImageChange}
            onAddItem={handleAddItem}
            onReorder={handleReorder}
            isLoading={isSaving || isUploading}
          />

          {formError && <p className="text-sm text-red-500 px-1">{formError}</p>}

          <RankingFormActions
            onSaveDraft={() => handleSave("DRAFT")}
            onSavePublish={() => handleSave("PUBLISHED")}
            disabled={isSaving || isUploading}
          />
        </>
      )}
    </div>
  );
}
