import { auth } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
// ★ ユーザーデータを取得する関数とカスタムフォームをインポート ★
import { getCurrentLoginUserData } from "@/lib/user/userService";
import { EditCustomProfileForm } from "@/components/component/profile/EditCustomProfileForm";
import { redirect } from "next/navigation"; // redirect をインポート

export default async function UserProfileSettingsPage() {
  // ★ 現在のログインユーザーデータを取得 ★
  const { userId } = await auth();
  if (!userId) {
     // 通常 middleware で保護されるが念のため
     redirect('/sign-in');
  }
  // userService を使って DB から詳細データを取得
  const currentUserData = await getCurrentLoginUserData(userId);

  // DB にユーザーデータがまだない場合（同期遅延など）はエラー表示かローディング表示を検討
  if (!currentUserData) {
      // ここでは仮にエラーメッセージを表示
      return <p>ユーザーデータの読み込みに失敗しました。少し時間をおいて再読み込みしてください。</p>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">プロフィール設定</h1>

      {/* Clerk が管理する情報の編集エリア */}
      <Card className="mb-8">
        <CardHeader>
           <CardTitle className="text-xl">アカウント情報</CardTitle>
           <CardDescription>ユーザー名、メール、パスワード、アバター画像などを変更できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfile path="/settings/profile" routing="path" />
        </CardContent>
      </Card>

      {/* --- ★ カスタムプロフィール情報編集フォームを追加 ★ --- */}
      <Card>
         <CardHeader>
             <CardTitle className="text-xl">カスタムプロフィール情報</CardTitle>
             <CardDescription>表示名、自己紹介、カバー画像URL、SNSリンクなどを編集できます。</CardDescription>
         </CardHeader>
         <CardContent>
            {/* 取得したユーザーデータを渡してフォームを表示 */}
            <EditCustomProfileForm userData={currentUserData} />
         </CardContent>
      </Card>
      {/* --- カスタムフォームここまで --- */}

    </div>
  );
}