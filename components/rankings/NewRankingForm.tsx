// components/rankings/NewRankingForm.tsx
"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { ListStatus } from "@/lib/types";
import { useToast } from "@/lib/hooks/use-toast";
import { useSubjectSuggestions } from "@/lib/hooks/useSubjectSuggestions";
import { useImageUploader } from "@/lib/hooks/useImageUploader";
import { createCompleteRankingAction } from "@/lib/actions/rankingActions";
import { validateRankingForm } from "@/lib/validation/rankings";
import { RankingBasicInfo } from "./common/RankingBasicInfo";
import { RankingItemsList } from "./common/RankingItemsList";
import { RankingFormActions } from "./common/RankingFormActions";
import type { EditableItem } from "./common/EditableRankedItem";

export function NewRankingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { uploadImage, isLoading: isUploading } = useImageUploader();
  const [isSubmitting, startSubmitTransition] = useTransition();

  // ─── 基本情報 state ───
  const [subject, setSubject] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");
  const { options: subjectOptions, isLoading: isSubjectLoading } =
    useSubjectSuggestions(subjectQuery);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // ─── アイテム state ───
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── アイテムを新規追加する ───
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

  // ─── アイテムのフィールドを更新する ───
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

  // ─── アイテムを削除する ───
  const handleDeleteItem = useCallback((clientId: string) => {
    setEditableItems((items) =>
      items.filter((item) => item.clientId !== clientId)
    );
  }, []);

  // ─── アイテムの画像を変更／削除する ───
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

  // ─── アイテムの並び順を入れ替える ───
  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setEditableItems((items) => arrayMove(items, oldIndex, newIndex));
  }, []);

  // ─── 下書き or 公開で保存を実行する ───
  const handleSave = useCallback(
    (status: ListStatus) => {
      startSubmitTransition(async () => {
        setFormError(null);

        // ----- ① 共通バリデーション呼び出し -----
        const error = validateRankingForm(
          subject,
          description,
          editableItems.map((it) => ({
            itemName: it.itemName,
            itemDescription: it.itemDescription,
          })),
          tags
        );
        if (error) {
          setFormError(error);
          return;
        }

        // ----- ② 画像アップロード＆データ整形 -----
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
            description: (err as Error).message,
            variant: "destructive",
          });
          return;
        }

        // ----- ③ サーバーアクション呼び出し -----
        const result = await createCompleteRankingAction(
          { subject, description, tags },
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
    },
    [subject, description, editableItems, tags, uploadImage, router, toast]
  );

  return (
    <div className="space-y-6">
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
        disabled={isSubmitting || isUploading}
      />

      <RankingItemsList
        subject={subject}
        items={editableItems}
        onItemChange={handleItemChange}
        onDeleteItem={handleDeleteItem}
        onImageChange={handleImageChange}
        onAddItem={handleAddItem}
        onReorder={handleReorder}
        isLoading={isSubmitting || isUploading}
      />

      {formError && <p className="text-sm text-red-500 px-1">{formError}</p>}

      <RankingFormActions
        onSaveDraft={() => handleSave("DRAFT")}
        onSavePublish={() => handleSave("PUBLISHED")}
        disabled={isSubmitting || isUploading}
      />
    </div>
  );
}
