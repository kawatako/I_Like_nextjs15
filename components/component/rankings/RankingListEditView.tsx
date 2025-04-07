"use client";

import { useState, useEffect } from "react";
import { Prisma, Sentiment, ListStatus } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveRankingListItemsAction } from "@/lib/actions/rankingActions"; // ★ 一括保存アクション
import { useToast } from "@/components/hooks/use-toast"; // Toast表示用 (要 shadcn add use-toast toast, layout.tsx に <Toaster />)
import { PlusIcon, TrashIcon } from "lucide-react"; // アイコン例

// getRankingListForEdit で取得するデータの型
const rankingListWithItemsPayload = Prisma.validator<Prisma.RankingListDefaultArgs>()({
  include: {
    items: {
      orderBy: {
        rank: 'asc', // DBからは rank でソートして取得
      },
    },
    // author: { select: { username: true } } // 必要なら追加
  },
});
type RankingListWithItems = Prisma.RankingListGetPayload<typeof rankingListWithItemsPayload>;

// クライアントで編集中のアイテムの型
interface EditableItem {
  id?: string; // 既存アイテムのDB上のID (新規は undefined)
  itemName: string;
  itemDescription?: string | null;
  imageUrl?: string | null; // 画像URL用フィールド (今回の実装ではまだ使わない)
}

// コンポーネントの Props の型
interface RankingListEditViewProps {
  rankingList: RankingListWithItems;
}

export function RankingListEditView({ rankingList }: RankingListEditViewProps) {
  const { toast } = useToast(); // Toast表示用 (要 shadcn add use-toast toast, layout.tsx に <Toaster />)
  const [isSaving, setIsSaving] = useState(false); // 保存処理中フラグ

  // --- クライアントサイド State ---
  const [subject, setSubject] = useState(rankingList.subject);
  const [description, setDescription] = useState(rankingList.description ?? "");
  // アイテム配列を State で管理 (DBのrankは無視し、配列の順序で管理)
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    rankingList.items.map(item => ({
      id: item.id,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      imageUrl: item.imageUrl,
    }))
  );
  // -----------------------------

  // アイテム追加ボタンの処理
  const handleAddItemSlot = () => {
    if (editableItems.length < 10) {
      setEditableItems([...editableItems, { itemName: "", itemDescription: null, imageUrl: null }]);
    } else {
      toast({ title: "アイテムは10個までです。", variant: "destructive" });
    }
  };

  // アイテム入力変更時の処理
  const handleItemChange = (index: number, field: keyof EditableItem, value: string | null) => {
    const newItems = [...editableItems];
    // Type assertion needed here as field access is dynamic. Be careful with types.
    (newItems[index] as any)[field] = value;
    setEditableItems(newItems);
  };

  // アイテム削除ボタンの処理
  const handleDeleteItem = (index: number) => {
    // ここで確認ダイアログを表示しても良い
    // if (window.confirm(`${index + 1}番目のアイテムを削除しますか？`)) { ... }
    const newItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(newItems);
  };

  // 保存処理（下書き or 公開）
  const handleSave = async (status: ListStatus) => {
    setIsSaving(true);
    // --- クライアントサイドバリデーション ---
    if (subject.trim() === "") {
        toast({ title: "テーマを入力してください。", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    // ★★★ 公開時のみアイテム名をチェック ★★★
    if (status === ListStatus.PUBLISHED) {
      if (editableItems.some(item => item.itemName.trim() === "")) {
          toast({ title: "公開するには、すべてのアイテム名を入力してください。", variant: "destructive" });
          setIsSaving(false);
          return;
      }
      if (editableItems.length === 0) {
          toast({ title: "公開するにはアイテムを1つ以上登録してください。", variant: "destructive" });
          setIsSaving(false);
          return;
      }
    }


    // Server Action 呼び出し
    const result = await saveRankingListItemsAction(
      rankingList.id,
      editableItems, // 現在のクライアントの状態配列
      subject,       // 現在のクライアントの状態
      description,   // 現在のクライアントの状態
      status         // 保存種別 (DRAFT or PUBLISHED)
    );
    setIsSaving(false);

    if (result.success) {
      toast({ title: status === ListStatus.DRAFT ? "下書きを保存しました。" : "ランキングを公開しました。" });
      // 保存成功後、revalidatePath が効くので基本的にはページ再読み込みは不要
      // 必要に応じて router.refresh() や、状態をDB保存後の値で更新するなどの処理
    } else {
      toast({ title: "保存に失敗しました", description: result.error, variant: "destructive" });
    }
  };

  // --- UI 部分 ---
  const sentimentLabel = rankingList.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";
  const sentimentColor = rankingList.sentiment === Sentiment.LIKE ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="space-y-6">
      {/* --- リスト情報編集 --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`px-2 py-0.5 ${sentimentColor}`}>{sentimentLabel}</Badge>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ランキングのテーマ"
              className="text-2xl font-bold flex-1 border-muted focus-visible:ring-1 focus-visible:ring-ring" // スタイル調整例
              maxLength={50}
            />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="リストの説明（任意）"
            rows={2}
            maxLength={500} // スキーマに合わせて調整
            className="border-muted focus-visible:ring-1 focus-visible:ring-ring" // スタイル調整例
          />
        </CardHeader>
      </Card>

      {/* --- アイテム一覧 & 編集 --- */}
      <Card className="space-y-3 max-h-[50vh] overflow-y-auto pr-3">
        <CardContent>
          {editableItems.length === 0 && (
             <p className="text-muted-foreground">下の「+」ボタンでアイテムを追加してください。</p>
          )}
          {/* editableItems 状態を map して入力欄リストを表示 */}
          <ul className="space-y-3">
            {editableItems.map((item, index) => (
              <li key={item.id ?? `new-${index}`} className="flex items-center gap-2 p-3 bg-secondary rounded">
                <span className="font-semibold w-8 text-center text-muted-foreground whitespace-nowrap">{`${index + 1}位`}</span>
                <div className="flex-1 space-y-1">
                    {/* アイテム名入力 */}
                    <Input
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      placeholder={`${index + 1}位のアイテム名`}
                      maxLength={100}
                      className="bg-background" // 背景色調整例
                    />
                    {/* 説明入力 */}
                    <Textarea
                       value={item.itemDescription ?? ""}
                       onChange={(e) => handleItemChange(index, 'itemDescription', e.target.value)}
                       placeholder="アイテムの説明・コメント（任意）"
                       rows={1} // 1行表示にしておく例
                       maxLength={500}
                       className="text-sm bg-background" // 背景色調整例
                    />
                    {/* TODO: 画像アップロードUIはここに後で追加 */}
                </div>
                 {/* 削除ボタン */}
                 <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(index)} title="アイテム削除" disabled={isSaving}>
                    <TrashIcon className="h-4 w-4 text-muted-foreground" />
                 </Button>
                 {/* TODO: ドラッグハンドル (並び替え用) */}
              </li>
            ))}
          </ul>
           {/* アイテム追加ボタン */}
           {editableItems.length < 10 && (
              <Button variant="outline" size="sm" onClick={handleAddItemSlot} className="mt-4" disabled={isSaving}>
                 <PlusIcon className="h-4 w-4 mr-2" />
                 アイテムを追加 ({editableItems.length + 1}位)
              </Button>
           )}
        </CardContent>
      </Card>

      {/* --- 保存ボタン --- */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleSave(ListStatus.DRAFT)} disabled={isSaving}>
             {isSaving ? '保存中...' : '下書き保存'}
          </Button>
          <Button onClick={() => handleSave(ListStatus.PUBLISHED)} disabled={isSaving}>
             {isSaving ? '保存中...' : '公開して保存'}
          </Button>
      </div>

      {/* Toast コンポーネントを表示するために、app/layout.tsx などに <Toaster /> を配置する必要があります */}
    </div>
  );
}