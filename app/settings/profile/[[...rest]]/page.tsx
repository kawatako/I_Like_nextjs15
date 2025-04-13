// app/settings/profile/[[...rest]]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { EditCustomProfileForm } from "@/components/component/profile/EditCustomProfileForm";
import { redirect } from "next/navigation";
import { getCurrentLoginUserData } from "@/lib/data/userQueries";

export default async function UserProfileSettingsPage() {
  const { userId } = await auth();
  if (!userId) {
     redirect('/sign-in');
  }
  const currentUserData = await getCurrentLoginUserData(userId);

  if (!currentUserData) {
      // エラーハンドリングまたはローディング表示
      return (
          <div className="container mx-auto max-w-2xl py-8 px-4">
              <p>ユーザーデータの読み込みに失敗しました。少し時間をおいて再読み込みしてください。</p>
          </div>
      );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card> {/* 親カード */}
        <CardHeader>
          <CardTitle className="text-2xl font-bold">プロフィール設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* --- カスタムプロフィール情報セクション --- */}
          <section>
            <h2 className="text-xl font-semibold mb-4">カスタムプロフィール情報</h2>
            {/* EditCustomProfileForm の幅は別途 max-w-[...] で調整が必要 */}
            <EditCustomProfileForm userData={currentUserData} />
          </section>

          <hr />

          {/* --- アカウント情報セクション (Clerk) --- */}
          <section>
            <h2 className="text-xl font-semibold mb-4">アカウント情報</h2>
            {/* ↓↓↓ appearance.elements.card に Card 風のスタイルを適用 ↓↓↓ */}
            <UserProfile
              path="/settings/profile"
              routing="path"
              appearance={{
                elements: {
                  // UserProfile 自体を囲む要素に Card と同様のスタイルを適用
                  // 注意: これが意図通りに機能するか、テーマの色が適用されるかは試す必要あり
                  // また、パディング (p-6) も適用してみる
                  card: 'border bg-card text-card-foreground rounded-lg shadow-sm p-6 w-full',

                  // 元の提案にあったリセット用スタイル (上記と競合する場合は調整)
                  // card: 'shadow-none border-none p-0 bg-transparent',

                  // 必要であれば他の内部要素も調整
                  // formButtonPrimary: 'bg-primary text-primary-foreground', // 例: ボタンの色をテーマに合わせる
                }
              }}
            />
            {/* ↑↑↑ appearance プロパティここまで ↑↑↑ */}
          </section>

        </CardContent>
      </Card>
    </div>
  );
}