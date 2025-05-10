// components/component/profiles/ProfileEditForm.tsx
"use client";

import { useState, useCallback, useRef, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client"; // Prisma の User 型を使う（または必要なフィールドだけの型）
import type { ActionResult } from "@/lib/types";
import { useImageUploader } from "@/components/hooks/useImageUploader"; // 画像アップロードフック
import {
  updateProfileAction,
  type ProfileUpdateData,
} from "@/lib/actions/userActons";
import { useToast } from "@/components/hooks/use-toast";
import ImageUploader from "../common/ImageUploader"; // 画像アップローダーUIコンポーネント
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"; // Card関連
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/component/Icons";
import { z } from "zod"; // バリデーション用

// --- Props の型定義 ---
// 編集に必要なユーザーデータの部分型を定義
// (lib/types.ts に UserProfileEditableData のような型を定義してインポートするのが望ましい)
type InitialProfileData = Pick<
  User,
  | "name"
  | "bio"
  | "location"
  | "birthday"
  | "image"
  | "coverImageUrl"
  | "socialLinks"
  | "username" // username もリダイレクト用に含める
>;

interface ProfileEditFormProps {
  initialData: InitialProfileData;
}

// --- Zod スキーマ (アクション側と合わせる) ---
// (アクションからインポートするか、共通ファイルに定義するのが望ましい)
const ProfileUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(30, "表示名は30文字以内で入力してください。")
      .optional()
      .nullable(),
    bio: z
      .string()
      .trim()
      .max(160, "自己紹介は160文字以内で入力してください。")
      .optional()
      .nullable(),
    location: z
      .string()
      .trim()
      .max(100, "場所は100文字以内で入力してください。")
      .optional()
      .nullable(),
    birthday: z
      .string()
      .nullable()
      .optional()
      // refine で日付として有効かチェック (空文字とnullは許可)
      .refine(
        (date) =>
          date === null ||
          date === undefined ||
          date === "" ||
          !isNaN(Date.parse(date)),
        {
          message: "有効な日付を入力してください。",
        }
      )
      // transform で Date オブジェクトか null に変換
      .transform((date) => (date && date !== "" ? new Date(date) : null)),
    socialLinks: z
      .object({
        x: z
          .string()
          .url("X: 有効なURLを")
          .optional()
          .nullable()
          .or(z.literal("")),
        instagram: z
          .string()
          .url("Instagram: 有効なURLを")
          .optional()
          .nullable()
          .or(z.literal("")),
        tiktok: z
          .string()
          .url("TikTok: 有効なURLを")
          .optional()
          .nullable()
          .or(z.literal("")),
        website: z
          .string()
          .url("Webサイト: 有効なURLを")
          .optional()
          .nullable()
          .or(z.literal("")),
      })
      .optional()
      .nullable(),
    // image, coverImageUrl はファイルで扱うため、ここではスキーマに入れない方が扱いやすい
    // image: z.string().url("有効な画像URLを").optional().nullable(),
    // coverImageUrl: z.string().url("有効なカバー画像URLを").optional().nullable(),
  })
  .strict();

// --- 編集フォームコンポーネント ---
export default function ProfileEditForm({ initialData }: ProfileEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition(); // フォーム送信中の状態

  // --- 各フォームフィールドの State ---
  const [name, setName] = useState(initialData.name ?? "");
  const [bio, setBio] = useState(initialData.bio ?? "");
  const [location, setLocation] = useState(initialData.location ?? "");
  // ★ 生年月日の初期値: Date オブジェクトを 'YYYY-MM-DD' 文字列に変換 ★
  const [birthday, setBirthday] = useState<string>(
    initialData.birthday
      ? new Date(initialData.birthday).toISOString().split("T")[0]
      : ""
  );
  // ★ socialLinks はオブジェクトとして管理 ★
  const [socialLinks, setSocialLinks] = useState({
    x: (initialData.socialLinks as any)?.x ?? "", // 型アサーション注意
    instagram: (initialData.socialLinks as any)?.instagram ?? "",
    tiktok: (initialData.socialLinks as any)?.tiktok ?? "",
    website: (initialData.socialLinks as any)?.website ?? "",
  });

  // --- 画像関連の State とフック ---
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  // アップローダーフックを2回呼び出す (別々のローディング状態を管理できる)
  const { uploadImage: uploadCoverImage, isLoading: isCoverUploading } =
    useImageUploader();
  const { uploadImage: uploadProfileImage, isLoading: isProfileUploading } =
    useImageUploader();

  // --- 画像選択/削除ハンドラ (ImageUploader に渡す) ---
  const handleCoverFileChange = useCallback((file: File | null) => {
    setCoverImageFile(file);
  }, []);
  const handleProfileFileChange = useCallback((file: File | null) => {
    setProfileImageFile(file);
  }, []);

  // --- フォーム送信処理 ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // TODO: クライアントサイドでの Zod バリデーション (任意)
    const formData = { name, bio, location, birthday, socialLinks };
    const validationResult = ProfileUpdateSchema.partial().safeParse(formData); // partial() で一部更新に対応
    if (!validationResult.success) {
      toast({
        title: "入力エラー",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    let coverImageUrl: string | null | undefined = initialData.coverImageUrl; // 既存URLを保持
    let imageUrl: string | null | undefined = initialData.image; // 既存URLを保持

    startTransition(async () => {
      try {
        // 画像アップロード (変更があれば実行)
        const uploadPromises: Promise<void>[] = [];
        if (coverImageFile) {
          uploadPromises.push(
            uploadCoverImage(coverImageFile).then((url) => {
              if (url) coverImageUrl = url;
              else throw new Error("カバー画像アップロード失敗");
            })
          );
        } else if (coverImageFile === null && initialData.coverImageUrl) {
          coverImageUrl = null; // 画像削除の場合
        }
        if (profileImageFile) {
          uploadPromises.push(
            uploadProfileImage(profileImageFile).then((url) => {
              if (url) imageUrl = url;
              else throw new Error("アイコン画像アップロード失敗");
            })
          );
        } else if (profileImageFile === null && initialData.image) {
          imageUrl = null; // 画像削除の場合
        }
        await Promise.all(uploadPromises);

        // 更新データの作成
        const updateData: ProfileUpdateData = {
          name: name || null, // 空文字は null に
          bio: bio || null,
          location: location || null,
          birthday: birthday || null, // 空文字は null に変換済みのはず
          socialLinks: {
            // 空文字は null に変換
            x: socialLinks.x || null,
            instagram: socialLinks.instagram || null,
            tiktok: socialLinks.tiktok || null,
            website: socialLinks.website || null,
          },
          image: imageUrl,
          coverImageUrl: coverImageUrl,
        };

        // Server Action 呼び出し
        const result = await updateProfileAction(updateData);

        if (result.success) {
          toast({ title: "プロフィールを更新しました" });
          // 更新成功したらプロフィールページに戻る
          router.push(`/profile/${initialData.username}`);
          router.refresh(); // サーバーコンポーネントのデータを再取得させる
        } else {
          throw new Error(result.error || "更新に失敗しました");
        }
      } catch (error) {
        toast({
          title: "エラー",
          description:
            error instanceof Error ? error.message : "更新できませんでした",
          variant: "destructive",
        });
      }
    });
  };

  // ボタンの disabled 状態
  const isProcessing = isPending || isCoverUploading || isProfileUploading;

  return (
    // --- JSX 骨格 ---
    <form onSubmit={handleSubmit} className='space-y-8'>
      {/* --- カバー画像 --- */}
      <ImageUploader
        label='カバー画像'
        initialImageUrl={initialData.coverImageUrl}
        onFileChange={handleCoverFileChange}
        disabled={isProcessing}
        previewClassName='w-full aspect-[3/1] sm:aspect-[4/1]' // 横長に
        buttonSize='sm'
        buttonClassName='mt-2'
      />

      {/* --- プロフィールアイコン --- */}
      {/* アイコンは重ねて表示するなど工夫が必要かも */}
      <div className='relative pl-4 sm:pl-6 pt-[-4rem] z-10 w-fit'>
        {" "}
        {/* 位置調整 */}
        <ImageUploader
          label='プロフィールアイコン'
          initialImageUrl={initialData.image}
          onFileChange={handleProfileFileChange}
          disabled={isProcessing}
          previewClassName='w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background' // 丸形、ボーダー
          buttonClassName='w-24 h-24 sm:w-32 sm:h-32 rounded-full flex-col' // 丸形ボタン
          buttonSize={null} // サイズ指定なし
        />
      </div>

      {/* --- 基本情報 --- */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1'>
            <Label htmlFor='name'>表示名</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='bio'>自己紹介</Label>
            <Textarea
              id='bio'
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={4}
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='location'>場所</Label>
            <Input
              id='location'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='birthday'>生年月日</Label>
            <Input
              id='birthday'
              type='date'
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </CardContent>
      </Card>

      {/* --- リンク --- */}
      <Card>
        <CardHeader>
          <CardTitle>リンク</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1'>
            <Label htmlFor='website'>Webサイト</Label>
            <Input
              id='website'
              type='url'
              placeholder='https://'
              value={socialLinks.website}
              onChange={(e) =>
                setSocialLinks({ ...socialLinks, website: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='x'>X (Twitter)</Label>
            <Input
              id='x'
              type='url'
              placeholder='https://x.com/...'
              value={socialLinks.x}
              onChange={(e) =>
                setSocialLinks({ ...socialLinks, x: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='instagram'>Instagram</Label>
            <Input
              id='instagram'
              type='url'
              placeholder='https://instagram.com/...'
              value={socialLinks.instagram}
              onChange={(e) =>
                setSocialLinks({ ...socialLinks, instagram: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='tiktok'>TikTok</Label>
            <Input
              id='tiktok'
              type='url'
              placeholder='https://tiktok.com/@...'
              value={socialLinks.tiktok}
              onChange={(e) =>
                setSocialLinks({ ...socialLinks, tiktok: e.target.value })
              }
              disabled={isProcessing}
            />
          </div>
        </CardContent>
      </Card>

      {/* --- 保存ボタン --- */}
      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.back()}
          disabled={isProcessing}
        >
          キャンセル
        </Button>
        <Button type='submit' disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          {isProcessing ? "保存中..." : "保存する"}
        </Button>
      </div>
    </form>
  );
}
