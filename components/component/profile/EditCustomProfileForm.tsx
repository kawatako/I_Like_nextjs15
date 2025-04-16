"use client";

import { useActionState } from "react"
import { useEffect, useRef } from "react";
import type { User } from "@prisma/client";
import type { ActionResult } from "@/lib/types";
import { updateUserProfileDetailsAction } from "@/lib/actions/userActons"; // 作成したアクションをインポート
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/component/SubmitButton";
import { useToast } from "@/components/hooks/use-toast"; // トースト通知のカスタムフックをインポート

// Props として現在のユーザーデータを受け取る
interface EditCustomProfileFormProps {
  // User 型から必要なフィールドだけ Pick しても良い
  userData: Pick<User, 'name' | 'bio' | 'coverImageUrl' | 'socialLinks'>;
}

const initialState: ActionResult = {
  success: false,
};

export function EditCustomProfileForm({ userData }: EditCustomProfileFormProps) {
  const [state, formAction] = useActionState(updateUserProfileDetailsAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  // socialLinks は JSON 型なので、パースしてデフォルト値として使う
  // 型安全のため、socialLinks の具体的な型を定義するのが望ましい
  const socialLinks: { twitter?: string, github?: string, website?: string } =
    (userData.socialLinks && typeof userData.socialLinks === 'object' && !Array.isArray(userData.socialLinks))
    ? userData.socialLinks as any // 型アサーションは仮。本来は型ガードやパース処理推奨
    : {};

  useEffect(() => {
    if (state.success) {
      toast({ title: "プロフィール情報を更新しました。" });
      // 成功時にフォームリセットは不要な場合が多い
      // formRef.current?.reset();
    }
  }, [state.success, toast]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-full">
      {/* 表示名 */}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" type="text" defaultValue={userData.name ?? ""} maxLength={50} />
      </div>

      {/* 自己紹介 */}
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={userData.bio ?? ""} rows={3} maxLength={160} />
      </div>

      {/* カバー画像URL (今はURL入力、将来的にはファイルアップロードに変更) */}
      <div>
        <Label htmlFor="coverImageUrl">カバー画像 URL</Label>
        <Input id="coverImageUrl" name="coverImageUrl" type="url" defaultValue={userData.coverImageUrl ?? ""} placeholder="https://..." />
        {/* TODO: ファイルアップロードUIに置き換え */}
      </div>

      {/* SNSリンク */}
      <div className="space-y-2">
         <Label>SNS link</Label>
         <Input name="xUrl" type="url" defaultValue={socialLinks.twitter ?? ""} placeholder="x URL (https://x.com/...)" />
         <Input name="instagramUrl" type="url" defaultValue={socialLinks.github ?? ""} placeholder="instagram URL (https://instagram.com/...)" />
         <Input name="websiteUrl" type="url" defaultValue={socialLinks.website ?? ""} placeholder="Webサイト URL" />
         {/* 必要に応じて他のSNS入力欄を追加 */}
      </div>


      {/* エラーメッセージ表示 */}
      {state?.error && ( <p className="text-sm text-red-500 whitespace-pre-wrap">{state.error}</p> )}

      {/* 送信ボタン */}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}