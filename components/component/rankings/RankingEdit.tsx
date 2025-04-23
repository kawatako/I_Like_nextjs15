// components/component/rankings/RankingEdit.tsx
"use client";

// --- React と Next.js のフック/コンポーネント ---
import { useState, useEffect, useCallback, useRef, useTransition, ChangeEvent } from "react";
import { useRouter } from 'next/navigation';
import Image from "next/image";

// --- Prisma と生成された型 ---
import { Prisma, ListStatus } from "@prisma/client";

// --- shadcn/ui コンポーネント ---
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // AlertDialog をインポート

// --- dnd-kit (ドラッグアンドドロップ) ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

// --- カスタムコンポーネント、フック、アクション、型 ---
import {EditableRankedItem,  type EditableItem } from "./EditableRankedItem"; // 分割したコンポーネント
import ImageUploader from "./ImageUploader"; // 画像アップローダー
import { PlusIcon, TrashIcon, GripVertical, ImagePlus, XIcon, Loader2 } from "@/components/component/Icons"; // アイコン
import { saveRankingListItemsAction, deleteRankingListAction } from "@/lib/actions/rankingActions"; // Server Actions
import type { RankingListEditableData } from "@/lib/types";
import { useImageUploader } from "@/components/hooks/useImageUploader";
import type { ActionResult } from "@/lib/types"; // 共通型
import { z } from "zod"; // バリデーション
import TagInput from "./TagInput"; 

interface RankingListEditViewProps {
  rankingList: RankingListEditableData;
}

// --- Zod スキーマ定義 ---
const subjectAllowedCharsRegex = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9 ]+$/u;
const SubjectSchema = z.string().trim().min(1, "テーマを入力してください。").max(50, "テーマは50字以内").regex(subjectAllowedCharsRegex, { message: "テーマには日本語、英数字、半角スペースのみ使用できます。" });
const ItemNameSchema = z.string().trim().min(1, "アイテム名は必須です。").max(100, "アイテム名は100字以内です。");
const DescriptionSchema = z.string().trim().max(500, "説明は500字以内です。").optional();
const TagNameSchema = z.string().trim().min(1, "タグ名は1文字以上入力してください").max(30, "タグ名は30文字以内で入力してください");

// --- コンポーネント本体 ---
export function RankingEdit({ rankingList }: RankingListEditViewProps) {
  // --- フックの初期化 ---
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition(); // 保存処理中の状態
  const [subject, setSubject] = useState(rankingList.subject); // タイトル state
  const [description, setDescription] = useState(rankingList.description ?? ""); // 説明 state
  const [editableItems, setEditableItems] = useState<EditableItem[]>( // アイテムリスト state
    rankingList.items.map(item => ({ // 既存アイテムデータを初期値に
      clientId: item.id, // DnD 用 ID
      id: item.id,       // DB ID
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageUrl: item.imageUrl, // 既存画像 URL
      imageFile: null,        // 新規ファイルは最初は null
      previewUrl: item.imageUrl // 初期プレビューは既存 URL
    }))
  );
  const [tags, setTags] = useState<string[]>(
    rankingList.tags ? rankingList.tags.map(tagRelation => tagRelation.name) : []
  );
  const [formError, setFormError] = useState<string | null>(null); // フォームエラーメッセージ
  // ヘッダー画像関連 state
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  // アップローダーフック
  const { uploadImage: uploadHeaderImage, isLoading: isHeaderUploading } = useImageUploader();
  const { uploadImage: uploadItemImage, isLoading: isItemUploading } = useImageUploader();
  const [isDeleting, startDeleteTransition] = useTransition(); // 削除用
  const [isMounted, setIsMounted] = useState(false); //マウント状態を管理する

    // ★★★ クライアントでのマウント後に isMounted を true にする ★★★
    useEffect(() => {
      setIsMounted(true);
    }, []);

  // --- アイテム操作ハンドラ ---
  const handleAddItemSlot = useCallback(() => {
    if (editableItems.length < 10) {
      const newClientId = `new-${Date.now()}-${Math.random()}`;
      setEditableItems((prev) => [...prev, { clientId: newClientId, itemName: "", itemDescription: null, imageUrl: null, imageFile: null, previewUrl: null }]);
    } else {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
    }
  }, [editableItems.length, toast]);

  const handleItemChange = useCallback((clientId: string, field: keyof Omit<EditableItem, 'clientId' | 'id' | 'imageFile' | 'previewUrl' | 'imageUrl'>, value: string | null) => {
    setEditableItems((currentItems) =>
      currentItems.map((item) =>
        item.clientId === clientId ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const handleDeleteItem = useCallback((clientId: string) => {
    const itemToDelete = editableItems.find(item => item.clientId === clientId);
    if (itemToDelete?.previewUrl && itemToDelete.previewUrl !== itemToDelete.imageUrl) {
      URL.revokeObjectURL(itemToDelete.previewUrl);
    }
    setEditableItems((currentItems) => currentItems.filter((item) => item.clientId !== clientId));
  }, [editableItems]);

  // --- 画像操作ハンドラ ---
  const handleHeaderImageFileChange = useCallback((file: File | null) => {
    setHeaderImageFile(file); // 親コンポーネントで File オブジェクトを保持
  }, []);

  const handleItemImageChange = useCallback((clientId: string, file: File | null) => {
    setEditableItems(currentItems => currentItems.map(item => {
      if (item.clientId === clientId) {
        if (item.previewUrl && item.previewUrl !== item.imageUrl) { URL.revokeObjectURL(item.previewUrl); }
        const newPreviewUrl = file ? URL.createObjectURL(file) : item.imageUrl ?? null;
        return { ...item, imageFile: file, previewUrl: newPreviewUrl };
      }
      return item;
    }));
  }, []);

  // --- DnD 設定とハンドラ ---
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
  }, []);

  // --- 保存処理 ---
  const handleSave = async (status: ListStatus) => {
    startSaveTransition(async () => {
      setFormError(null);
      // バリデーション
      try { SubjectSchema.parse(subject); } catch (e) { if (e instanceof z.ZodError) { setFormError(e.errors[0].message); return; } }
      try { DescriptionSchema.parse(description); } catch (e) { if (e instanceof z.ZodError) { setFormError(e.errors[0].message); return; } }
      if (status === ListStatus.PUBLISHED && editableItems.length === 0) { setFormError("公開にはアイテムを1つ以上登録"); return; }
      try {
        if (tags.length > 5) throw new Error("タグは5個まで");
        tags.forEach(tag => TagNameSchema.parse(tag));
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
        try { ItemNameSchema.parse(editableItems[i].itemName); } catch (e) { if (e instanceof z.ZodError) { setFormError(`${i+1}番目: ${e.errors[0].message}`); return; } }
        try { DescriptionSchema.parse(editableItems[i].itemDescription ?? ""); } catch (e) { if (e instanceof z.ZodError) { setFormError(`${i+1}番目説明: ${e.errors[0].message}`); return; } }
      }

      let headerImageUrl: string | null | undefined = rankingList.listImageUrl; // 既存を初期値
      const itemImageUrls: { clientId: string; imageUrl: string | null }[] = [];
      let uploadSuccess = true;

      try {
        // 画像アップロード (並列処理)
        const uploadPromises: Promise<void>[] = [];
        if (headerImageFile) { // 新しいファイルがあればアップロード
          uploadPromises.push( uploadHeaderImage(headerImageFile).then(url => { if(url) headerImageUrl = url; else uploadSuccess = false; }) );
        } else if (headerImageFile === null && rankingList.listImageUrl) {
           headerImageUrl = null; // ファイルが削除された場合
        }
        // else: headerImageFile も null で既存 URL も null なら何もしない

        editableItems.forEach(item => {
          if (item.imageFile) { // 新しいファイルがあればアップロード
            uploadPromises.push( uploadItemImage(item.imageFile).then(url => { itemImageUrls.push({ clientId: item.clientId, imageUrl: url }); if (!url) uploadSuccess = false; }) );
          } else {
            // 新しいファイルがなく、既存の URL がある場合はそれを維持、なければ null
             itemImageUrls.push({ clientId: item.clientId, imageUrl: item.imageUrl ?? null });
          }
        });
        await Promise.all(uploadPromises);
        if (!uploadSuccess) throw new Error("画像アップロード中にエラーが発生しました。");

        // Server Action に渡すデータ
        const rankingData = { subject, description, listImageUrl: headerImageUrl, tags: tags };
        const itemsData = editableItems.map(item => {
           const uploaded = itemImageUrls.find(u => u.clientId === item.clientId);
           return {
             id: item.id, // ★ 既存アイテムの ID も渡す ★
             itemName: item.itemName,
             itemDescription: item.itemDescription,
             imageUrl: uploaded?.imageUrl ?? null // アップロード結果 or 既存 URL or null
           };
        });
        // TODO: タグ情報も渡す

        console.log("Saving edited ranking:", { rankingData, itemsData, status });
        // ★ 更新用 Server Action を呼び出す (引数修正が必要) ★
        const result = await saveRankingListItemsAction(rankingList.id, itemsData, subject, description, headerImageUrl, [], status);

        // 結果ハンドリング
        if (result.success) {
          toast({ title: status === ListStatus.DRAFT ? "下書きを保存しました。" : "ランキングを更新・公開しました。" });
          router.push(`/rankings/${rankingList.id}`); // 更新後は詳細ページへ
        } else {
          setFormError(result.error || "保存中に不明なエラーが発生しました。");
          toast({ title: "保存エラー", description: result.error, variant: "destructive" });
        }
      } catch (error) {
        console.error("Error saving ranking:", error);
        const message = error instanceof Error ? error.message : "予期せぬエラーが発生しました。";
        setFormError(message);
        toast({ title: "エラー", description: message, variant: "destructive" });
      }
    });
  };

  // ★ 削除処理ハンドラ (useActionState を使わない場合) ★
  const handleDeleteConfirm = async () => {
      if (!window.confirm(`ランキング「${subject}」を本当に削除しますか？この操作は元に戻せません。`)) {
        return;
      }
      startDeleteTransition(async () => {
         try {
            // deletePostAction と同様に postId (listId) を直接渡す形式に変更推奨
            // const result = await deleteRankingListAction(rankingList.id);
            // useActionState を使う場合は form でラップする必要あり
             const formData = new FormData();
             formData.append('listId', rankingList.id);
             const result = await deleteRankingListAction(null, formData); // 仮: useActionState 前提の呼び出し

            if (result.success) {
               toast({ title: "ランキングを削除しました。" });
               router.push(`/profile/${rankingList.author?.username}`); // 削除後はプロフィールへ (author情報が必要)
            } else {
               throw new Error(result.error || "削除に失敗しました。");
            }
         } catch (error) {
            toast({ title: "削除エラー", description: error instanceof Error ? error.message : "削除できませんでした", variant: "destructive" });
         }
      });
  };


  // ボタンの disabled 状態
  const isProcessing = isSaving || isHeaderUploading || isItemUploading || isDeleting; // 削除中も考慮

    //ハイドレーションエラー回避のためisMounted が false の間はローディング表示などを出す ★
    if (!isMounted) {
      return (
         <div className="p-4 text-center flex justify-center items-center h-40">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
         </div>
      );
   }
 

  // --- JSX レンダリング ---
  return (
    <>
    {isMounted && (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* 基本情報編集カード */}
        <Card>
          <CardHeader>
             {/* ★ Sentiment 表示を削除 ★ */}
             <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ランキングのテーマ *" className={"text-xl font-semibold ..."} maxLength={50} disabled={isProcessing} />
             <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="リストの説明（任意）" rows={2} maxLength={500} className="..." disabled={isProcessing} />
             {/* ★ ヘッダー画像 UI (ImageUploader を使用) ★ */}
             <div className="mt-4">
                <ImageUploader
                   label="ヘッダー画像"
                   initialImageUrl={rankingList.listImageUrl} // 既存画像を渡す
                   onFileChange={handleHeaderImageFileChange}
                   disabled={isProcessing}
                   previewClassName="w-48 h-24"
                   buttonSize="sm"
                />
                {isHeaderUploading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />}
                {/* headerUploadError の表示は任意 */}
             </div>
             <div className="mt-4">
               <Label htmlFor="tags">タグ（任意, 5個まで）</Label>
               <TagInput
                  value={tags} // ★ state を渡す ★
                  onChange={setTags} // ★ state 更新関数を渡す ★
                  placeholder="タグを追加 (例: 映画, アニメ)"
                  maxTags={5}
                  maxLength={30}
                  disabled={isProcessing}
               />
             </div>
          </CardHeader>
        </Card>

        {/* アイテム編集カード */}
        <Card className="max-h-[60vh] overflow-y-auto pr-3">
          <CardHeader>
            <CardTitle>ランキングアイテム</CardTitle>
            <CardDescription>アイテムを追加・編集・並び替えしてください。(ドラッグ＆ドロップで並び替え)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {editableItems.length === 0 && ( <p className="text-muted-foreground px-3">下の「+」ボタンでアイテムを追加してください。</p> )}
            {/* アイテムリスト */}
            <SortableContext items={editableItems.map(item => item.clientId)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
                 {editableItems.map((item, index) => (
                   <EditableRankedItem
                      key={item.clientId}
                      clientId={item.clientId}
                      item={item}
                      index={index}
                      handleItemChange={handleItemChange}
                      handleDeleteItem={handleDeleteItem}
                      handleItemImageChange={handleItemImageChange}
                      // handleRemoveItemImage は handleItemImageChange(id, null) で代用
                      isSaving={isProcessing} // isProcessing を渡す
                    />
                 ))}
              </ul>
            </SortableContext>
            {/* アイテム追加ボタン */}
            {editableItems.length < 10 && (
              <div className="pt-3">
                  <Button variant="outline" size="sm" onClick={handleAddItemSlot} disabled={isProcessing}>
                     <PlusIcon className="h-4 w-4 mr-2" />
                     アイテムを追加 ({editableItems.length + 1}位)
                  </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* フォーム全体のエラー表示 */}
        {formError && <p className='text-sm text-red-500 px-1'>{formError}</p>}

        {/* 保存・削除ボタン */}
        <div className="flex justify-between items-center pt-4 border-t">
           {/* 削除ボタン (AlertDialog を使う例) */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isProcessing}>リストを削除</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ランキング「{subject}」を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>この操作は元に戻せません。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isDeleting ? '削除中...' : '削除する'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

           {/* 保存ボタン群 */}
           <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => handleSave(ListStatus.DRAFT)} disabled={isProcessing}>
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 {isSaving ? '保存中...' : '下書き保存'}
              </Button>
              <Button onClick={() => handleSave(ListStatus.PUBLISHED)} disabled={isProcessing}>
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 {isSaving ? '更新中...' : '公開して更新'}
              </Button>
           </div>
        </div>
      </div>
    </DndContext>
    )}
    </>
  );
}
