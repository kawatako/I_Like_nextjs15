"use client";

import { useState, useCallback, useTransition, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";
import { useImageUploader } from "@/components/hooks/useImageUploader";
import { updateProfileAction, type ProfileUpdateData } from "@/lib/actions/userActons";
import { useToast } from "@/components/hooks/use-toast";
import ImageUploader from "../common/ImageUploader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/component/Icons";
import { z } from "zod";

// 編集に必要なユーザーデータの部分型
export type InitialProfileData = Pick<
  User,
  | "name"
  | "bio"
  | "location"
  | "birthday"
  | "image"
  | "coverImageUrl"
  | "socialLinks"
  | "username"
>;

interface ProfileEditFormProps {
  initialData: InitialProfileData;
}

// --- Zod スキーマ (アクション側と合わせる) ---
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
      .instanceof(Date)
      .nullable()
      .optional(),
    socialLinks: z
      .object({
        x: z.string().url("X: 有効なURLを").optional().nullable().or(z.literal("")),
        instagram: z.string().url("Instagram: 有効なURLを").optional().nullable().or(z.literal("")),
        tiktok: z.string().url("TikTok: 有効なURLを").optional().nullable().or(z.literal("")),
        website: z.string().url("Webサイト: 有効なURLを").optional().nullable().or(z.literal("")),
      })
      .optional()
      .nullable(),
  })
  .strict();

export default function ProfileEditForm({ initialData }: ProfileEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // テキストフィールド
  const [name, setName] = useState(initialData.name ?? "");
  const [bio, setBio] = useState(initialData.bio ?? "");
  const [location, setLocation] = useState(initialData.location ?? "");
  const [birthday, setBirthday] = useState<string>(
    initialData.birthday
      ? new Date(initialData.birthday).toISOString().split("T")[0]
      : ""
  );
  const [socialLinks, setSocialLinks] = useState({
    x: (initialData.socialLinks as any)?.x ?? "",
    instagram: (initialData.socialLinks as any)?.instagram ?? "",
    tiktok: (initialData.socialLinks as any)?.tiktok ?? "",
    website: (initialData.socialLinks as any)?.website ?? "",
  });

  // --- ① 三値 state に変更 ---
  // undefined: 未操作 / File: 新規アップロード / null: 削除
  const [coverImageFile, setCoverImageFile] = useState<File | null | undefined>(undefined);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);

  const [profileImageFile, setProfileImageFile] = useState<File | null | undefined>(undefined);
  const [profileImagePath, setProfileImagePath] = useState<string | null>(null);

  const { uploadImage: uploadCoverImage, isLoading: isCoverUploading } = useImageUploader();
  const { uploadImage: uploadProfileImage, isLoading: isProfileUploading } = useImageUploader();

  const handleCoverFileChange = useCallback((file: File | null) => {
    setCoverImageFile(file);
    setCoverImagePath(null);
  }, []);
  const handleProfileFileChange = useCallback((file: File | null) => {
    setProfileImageFile(file);
    setProfileImagePath(null);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 入力検証
    const formData = { name, bio, location, birthday, socialLinks };
    const validationResult = ProfileUpdateSchema.partial().safeParse(formData);
    if (!validationResult.success) {
      toast({
        title: "入力エラー",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        // プレビュー更新用 URL
        let coverUrl: string | null | undefined = initialData.coverImageUrl;
        let profileUrl: string | null | undefined = initialData.image;

        const uploadPromises: Promise<void>[] = [];

        // cover
        if (coverImageFile !== undefined) {
          if (coverImageFile) {
            uploadPromises.push(
              uploadCoverImage(coverImageFile).then((res) => {
                if (!res) throw new Error("カバー画像アップロード失敗");
                coverUrl = res.signedUrl;
                setCoverImagePath(res.path);
              })
            );
          } else {
            // 画像削除
            coverUrl = null;
            setCoverImagePath(null);
          }
        }

        // profile
        if (profileImageFile !== undefined) {
          if (profileImageFile) {
            uploadPromises.push(
              uploadProfileImage(profileImageFile).then((res) => {
                if (!res) throw new Error("アイコンアップロード失敗");
                profileUrl = res.signedUrl;
                setProfileImagePath(res.path);
              })
            );
          } else {
            profileUrl = null;
            setProfileImagePath(null);
          }
        }

        await Promise.all(uploadPromises);

        // --- ② updateData に image/coverImageUrl を必要時のみ含める ---
        const updateData: Partial<ProfileUpdateData> = {
          name: name || null,
          bio: bio || null,
          location: location || null,
          birthday: birthday || null,
          socialLinks: {
            x: socialLinks.x || null,
            instagram: socialLinks.instagram || null,
            tiktok: socialLinks.tiktok || null,
            website: socialLinks.website || null,
          },
        };

        if (coverImageFile !== undefined) {
          updateData.coverImageUrl = coverImagePath;
        }
        if (profileImageFile !== undefined) {
          updateData.image = profileImagePath;
        }

        const result = await updateProfileAction(updateData as ProfileUpdateData);

        if (result.success) {
          toast({ title: "プロフィールを更新しました" });
          router.push(`/profile/${initialData.username}`);
          router.refresh();
        } else {
          throw new Error(result.error || "更新に失敗しました");
        }
      } catch (error: any) {
        toast({
          title: "エラー",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const isProcessing =
    isPending || isCoverUploading || isProfileUploading;

  return (
    <form onSubmit={handleSubmit} className='space-y-8'>
      <ImageUploader
        label='カバー画像'
        initialImageUrl={initialData.coverImageUrl ?? null}
        onFileChange={handleCoverFileChange}
        disabled={isProcessing}
        previewClassName='w-full aspect-[3/1] sm:aspect-[4/1]'
        buttonSize='sm'
        buttonClassName='mt-2'
      />

      <div className='relative pl-4 sm:pl-6 pt-[-4rem] z-10 w-fit'>
        <ImageUploader
          label='プロフィールアイコン'
          initialImageUrl={initialData.image ?? null}
          onFileChange={handleProfileFileChange}
          disabled={isProcessing}
          previewClassName='w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background'
          buttonClassName='w-24 h-24 sm:w-32 sm:h-32 rounded-full flex-col'
          buttonSize={null}
        />
      </div>

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
              onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
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
              onChange={(e) => setSocialLinks({ ...socialLinks, x: e.target.value })}
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
              onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
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
              onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
              disabled={isProcessing}
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-2'>
        <Button type='button' variant='outline' onClick={() => router.back()} disabled={isProcessing}>
          キャンセル
        </Button>
        <Button type='submit' disabled={isProcessing}>
          {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
          {isProcessing ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
