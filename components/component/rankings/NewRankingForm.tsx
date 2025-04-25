// components/component/rankings/NewRankingForm.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Prisma, ListStatus } from "@prisma/client";
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
import { PlusIcon, Loader2 } from "@/components/component/Icons"; // アイコンは必要なもののみ
import { createCompleteRankingAction } from "@/lib/actions/rankingActions";
import { useImageUploader } from "@/components/hooks/useImageUploader";
// import Image from "next/image"; // Image は ImageUploader と EditableRankedItem が使う
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
// ★★★ 分割したコンポーネントと関連型をインポート ★★★
import { EditableRankedItem, type EditableItem } from "./EditableRankedItem";
import ImageUploader from "../common/ImageUploader"; // パスを確認
import type { ActionResult } from "@/lib/types";
import TagInput from "./TagInput";

// --- Zod スキーマ ---
const subjectAllowedCharsRegex =
  /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z
  .string()
  .trim()
  .min(1, "テーマを入力してください。")
  .max(50, "テーマは50字以内")
  .regex(subjectAllowedCharsRegex, { message: "使用できない文字種" });
const ItemNameSchema = z
  .string()
  .trim()
  .min(1, "アイテム名は必須です。")
  .max(100, "アイテム名は100字以内");
const DescriptionSchema = z
  .string()
  .trim()
  .max(500, "説明は500字以内")
  .optional();
const TagNameSchema = z
  .string()
  .trim()
  .min(1, "タグ名は1文字以上入力してください")
  .max(30, "タグ名は30文字以内で入力してください");

// --- フォームコンポーネント本体 ---
export function NewRankingForm() {
  // --- フックの初期化 ---
  const router = useRouter();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]); // ★ EditableItem 型をインポートして使用 ★
  const [tags, setTags] = useState<string[]>([]); // ★ タグ配列用
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  // ★ ヘッダー画像用の File State は必要 ★
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  // ★ アップローダーフック (ヘッダー用とアイテム用) ★
  const { uploadImage: uploadHeaderImage, isLoading: isHeaderUploading } =
    useImageUploader();
  const { uploadImage: uploadItemImage, isLoading: isItemUploading } =
    useImageUploader(); // アイテム画像アップロード用

  // --- アイテム操作関連の関数 (画像ハンドラ含む) ---
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
        "clientId" | "id" | "imageFile" | "previewUrl" | "imageUrl"
      >,
      value: string | null
    ) => {
      setEditableItems((currentItems) =>
        currentItems.map((item) =>
          item.clientId === clientId ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const handleDeleteItem = useCallback(
    (clientId: string) => {
      // アイテム削除時にプレビューURLを破棄
      const itemToDelete = editableItems.find(
        (item) => item.clientId === clientId
      );
      if (itemToDelete?.previewUrl) {
        URL.revokeObjectURL(itemToDelete.previewUrl);
      }
      setEditableItems((currentItems) =>
        currentItems.filter((item) => item.clientId !== clientId)
      );
    },
    [editableItems]
  ); // editableItems を依存配列に追加

  // ★ ヘッダー画像ファイルが変更されたときのハンドラ ★
  const handleHeaderImageFileChange = useCallback((file: File | null) => {
    setHeaderImageFile(file); // File オブジェクトを state に保存
  }, []);

  // ★ アイテム画像ファイルが変更されたときのハンドラ ★
  const handleItemImageChange = useCallback(
    (clientId: string, file: File | null) => {
      setEditableItems((currentItems) =>
        currentItems.map((item) => {
          if (item.clientId === clientId) {
            // 既存のプレビューがあれば破棄
            if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(item.previewUrl);
            }
            // 新しいプレビューURLを生成して state を更新
            const newPreviewUrl = file ? URL.createObjectURL(file) : null;
            return { ...item, imageFile: file, previewUrl: newPreviewUrl };
          }
          return item;
        })
      );
    },
    []
  );

  // --- DnD (ドラッグアンドドロップ) 関連の設定 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ドラッグ終了時のアイテム並び替え処理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems((items) => {
        const oldIndex = items.findIndex((item) => item.clientId === active.id);
        const newIndex = items.findIndex((item) => item.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // --- 保存処理ハンドラ
  const handleSave = async (status: ListStatus) => {
    startSubmitTransition(async () => {
      setFormError(null);
      // クライアントサイドバリデーション
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
        setFormError("公開するにはアイテムを1つ以上登録");
        return;
      }
      try {
        if (tags.length > 5) throw new Error("タグは5個まで");
        tags.forEach((tag) => TagNameSchema.parse(tag));
      } catch (e) {
        if (e instanceof z.ZodError) {
          setFormError(`タグ: ${e.errors[0].message}`);
          return;
        } else if (e instanceof Error) {
          setFormError(e.message);
          return;
        }
      }
      for (let i = 0; i < editableItems.length; i++) {
        try {
          ItemNameSchema.parse(editableItems[i].itemName);
        } catch (e) {
          if (e instanceof z.ZodError) {
            setFormError(`${i + 1}番目: ${e.errors[0].message}`);
            return;
          }
        }
        try {
          DescriptionSchema.parse(editableItems[i].itemDescription ?? "");
        } catch (e) {
          if (e instanceof z.ZodError) {
            setFormError(`${i + 1}番目説明: ${e.errors[0].message}`);
            return;
          }
        }
      }

      let headerImageUrl: string | null = null;
      const itemImageUrls: { clientId: string; imageUrl: string | null }[] = [];
      let uploadSuccess = true;

      try {
        // 画像アップロード (Promise.all)
        const uploadPromises: Promise<void>[] = [];
        if (headerImageFile) {
          uploadPromises.push(
            uploadHeaderImage(headerImageFile).then((url) => {
              if (url) headerImageUrl = url;
              else uploadSuccess = false;
            })
          );
        }
        editableItems.forEach((item) => {
          if (item.imageFile) {
            uploadPromises.push(
              uploadItemImage(item.imageFile).then((url) => {
                itemImageUrls.push({ clientId: item.clientId, imageUrl: url });
                if (!url) uploadSuccess = false;
              })
            );
          } else {
            itemImageUrls.push({
              clientId: item.clientId,
              imageUrl: item.imageUrl ?? null,
            }); // 既存の URL があればそれを使い、なければ null
          }
        });
        await Promise.all(uploadPromises);
        if (!uploadSuccess) throw new Error("画像アップロードエラー");

        // Server Action に渡すデータ
        const rankingData = {
          subject,
          description,
          listImageUrl: headerImageUrl,
          tags: tags,
        };
        const itemsData = editableItems.map((item) => {
          const uploaded = itemImageUrls.find(
            (u) => u.clientId === item.clientId
          );
          return {
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            imageUrl: uploaded?.imageUrl ?? null, // アップロード結果 or 既存 URL or null
          };
        });

        console.log("Saving ranking with:", { rankingData, itemsData, status });

        // Server Action を呼び出す (引数修正が必要)
        const result = await createCompleteRankingAction(
          rankingData,
          itemsData,
          status
        );

        // 結果ハンドリング
        if (result.success /* && result.newListId */) {
          toast({
            title:
              status === ListStatus.DRAFT
                ? "下書き保存"
                : "作成・公開しました。",
          });
          router.push(`/rankings/${result.newListId}`);
        } else {
          setFormError(result.error || "保存中に不明なエラー");
          toast({
            title: "保存エラー",
            description: result.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error saving ranking:", error);
        const message =
          error instanceof Error ? error.message : "予期せぬエラー";
        setFormError(message);
        toast({
          title: "エラー",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  // ボタンの disabled 状態
  const isSaving = isSubmitting || isHeaderUploading;

  // --- JSX レンダリング ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className='space-y-6'>
        {/* 基本情報入力カード */}
        <Card>
          <CardHeader>
            <CardTitle>ランキング基本情報</CardTitle>
            <CardDescription>
              ランキングのテーマや説明、ヘッダー画像を設定します。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* ★★★ ヘッダー画像 UI を ImageUploader コンポーネントに置き換え ★★★ */}
            <ImageUploader
              label='ヘッダー画像'
              onFileChange={handleHeaderImageFileChange} // ファイル選択/削除をハンドラ経由で受け取る
              disabled={isSaving}
              previewClassName='w-48 h-24' // プレビューサイズ指定
              // initialImageUrl は新規作成なので不要
            />
            {/* テーマ入力 */}
            <div>
              <Label htmlFor='subject'>テーマ*</Label>
              <Input
                id='subject'
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={50}
                required
                disabled={isSaving}
              />
            </div>
            {/* 説明入力 */}
            <div>
              <Label htmlFor='description'>説明(任意)</Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isSaving}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor='tags'>タグ（任意, 5個まで）</Label>
              <TagInput
                value={tags} // ★ state を渡す ★
                onChange={setTags} // ★ state 更新関数を渡す ★
                placeholder='タグを追加 (例: 映画, アニメ)'
                maxTags={5}
                maxLength={30}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>
        {/* アイテム編集カード */}
        <Card>
          <CardHeader>
            <CardTitle>ランキングアイテム</CardTitle>
            <CardDescription>...</CardDescription>
          </CardHeader>
          <CardContent className='pt-0 space-y-3'>
            {editableItems.length === 0 && (
              <p className='text-muted-foreground text-sm px-3 py-2'></p>
            )}
            {/* ★★★ SortableContext と map で EditableRankedItem を呼び出す ★★★ */}
            <SortableContext
              items={editableItems.map((item) => item.clientId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className='space-y-3'>
                {editableItems.map((item, index) => (
                  <EditableRankedItem
                    key={item.clientId}
                    clientId={item.clientId}
                    item={item} // item には imageFile, previewUrl も含まれる
                    index={index}
                    handleItemChange={handleItemChange}
                    handleDeleteItem={handleDeleteItem}
                    handleItemImageChange={handleItemImageChange} // ★ 画像ハンドラを渡す ★
                    // handleRemoveItemImage は handleItemImageChange(id, null) で代用 ★
                    isSaving={isSaving}
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
                  disabled={isSaving}
                >
                  ...
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* フォーム全体のエラー表示 */}
        {formError && (
          <p className='text-sm text-red-500 px-1'>{formError}</p>
        )}{" "}
        {/* px-1 追加 */}
        {/* 保存ボタン */}
        <div className='flex justify-end items-center space-x-2 pt-4 border-t'>
          <Button
            variant='outline'
            onClick={() => handleSave(ListStatus.DRAFT)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {isSaving ? "保存中..." : "下書き保存"}
          </Button>
          <Button
            onClick={() => handleSave(ListStatus.PUBLISHED)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {isSaving ? "作成中..." : "公開して作成"}
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
