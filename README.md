# ファイル構成



# 役割
## app関連
### ユーザーが見る画面と URL の対応付け、API エンドポイントの定義。

### app/api/webhooks/clerk/route.ts 
目的: Clerk サービスから送信される Webhook イベントを受信し、処理するための専用 API ルート。
主な機能:
Webhook 受信: Clerk から /api/webhooks/clerk 宛に送られてくる POST リクエストを受け付けます。
リクエスト検証: Svix ライブラリと WEBHOOK_SECRET を使用して、受信したリクエストが本当に Clerk から送られたもので、改ざんされていないかを確認します（セキュリティ）。
イベント解析: リクエストのペイロード（中身）を解析し、イベントの種類 (user.created, user.updated, user.deleted など) と関連データ（ユーザーID、ユーザー名など）を特定します。
データベース同期: イベントの種類に応じて、Supabase データベースのユーザー情報を Clerk 側の状態と同期させます。
user.created: Prisma の upsert を使ってユーザーを作成（または重複なら更新）。
user.updated: Prisma の update を使ってユーザー情報を更新。
user.deleted: Prisma の delete を使ってユーザーを削除。
Clerk への応答: 処理が成功したか失敗したかを HTTP ステータスコード（200 OK や 500 Error など）で Clerk に返します。
トリガー: Clerk 側でのイベント（ユーザー登録、情報更新、削除など）によって自動的に呼び出されます。アプリケーションのユーザー操作から直接呼び出されるわけではありません。

## components関連
###  UI を作るための部品置き場。

### component/Icons.tsx
役割: このファイルは、アプリケーション内で使用する様々な SVG アイコンを React コンポーネントとして定義し、提供する役割を担っています。BellIcon, BookmarkIcon, HeartIcon, HomeIcon など、多数のアイコンが関数コンポーネントとしてエクスポートされています。
使われ方: 他のコンポーネント（例: LeftSidebar.tsx, Header.tsx, SubmitButton.tsx など）でアイコンを表示したい場合に、このファイルから必要なアイコンコンポーネントをインポートして使用します。例えば、import { HeartIcon } from '@/components/component/Icons' のようにして読み込み、<HeartIcon className="h-5 w-5" /> のように使います。アイコンを一元管理することで、利用しやすく、変更も容易になります。

### component/SubmitButton.tsx
役割: これは、フォーム送信時に使用するための専用ボタンコンポーネントです。特に、非同期処理（Server Action など）が実行されている間のローディング状態（Pending 状態）をユーザーに視覚的にフィードバックする機能を持っています。
実装:
"use client" ディレクティブがあり、クライアントコンポーネントとして動作します。
React の useFormStatus フックを使って、親フォームの送信状態（pending）を取得します。
pending が true の間（＝フォーム送信処理中）は、ボタンを disabled（無効）にし、cursor-not-allowed クラスを適用します。
見た目は components/ui/button の Button コンポーネントを使い、中には SendIcon を表示します。

### component/component.tsx




## lib関連
### アプリの裏側で動くロジックや、データベースとのやり取りを担当する関数群
### lib/user/userService.ts
目的: ユーザーに関連するデータベース操作をまとめるためのファイル（サービスレイヤー）。
主な機能 (getCurrentLoginUserData 関数):
Clerk から提供されたユーザーID (clerkId) を受け取り、それを使って Supabase データベースから対応するユーザー情報を取得します。
内部では Prisma クライアント (prisma.user.findUnique) を使用してデータベースに問い合わせます。
取得したユーザーデータ（または見つからなかった場合は null）を呼び出し元（例: app/page.tsx）に返します。
呼び出し元: Next.js のサーバーコンポーネント (app/page.tsx など) や他の API ルートから、アプリケーション自身のデータベースに保存されているユーザー情報（Clerk が直接提供しない bio や、DB 内部の id などを含む）が必要な場合に呼び出されます。
役割を一言で: アプリケーションが**「データベースからユーザー情報を取得する」**際の窓口・処理担当。データベースの詳細を隠蔽し、再利用可能な形で機能を提供します。




# 仮
app/: ルーティングと UI の中心

layout.tsx: 全ページ共通のレイアウト（HTMLの<html>や<body>タグなどを含む）。
page.tsx: アプリケーションのルート (/) に対応するページ。
globals.css: アプリ全体に適用する CSS スタイル。
favicon.ico: ブラウザタブなどのアイコン。
api/webhooks/clerk/route.ts: Clerk からの Webhook を受信し、DB 同期を行う API ルート。
profile/[username]/page.tsx: ユーザープロフィールページ (/profile/ユーザー名)。動的ルーティングを使用。
sign-in/[[...sign-in]]/page.tsx: Clerk のサインインページ用ルート。
sign-up/[[...sign-up]]/page.tsx: Clerk のサインアップページ用ルート。
components/: 再利用可能な UI コンポーネント

component/: アプリケーション固有のカスタム UI コンポーネント群。
LeftSidebar.tsx, MainContent.tsx, RightSidebar.tsx: 主要なレイアウト部品。
Header.tsx, Post.tsx, PostForm.tsx, Comment.tsx, FollowButton.tsx など: アプリケーションの各機能を構成する UI 部品。
ui/: より汎用的、基本的な UI 部品（shadcn/ui などで生成されたものが多い）。
button.tsx, card.tsx, input.tsx, avatar.tsx, tabs.tsx など。
lib/: 共通ロジック・ユーティリティ・サービス

client.ts: Prisma Client のインスタンス生成・エクスポート。
utils.ts: 共通ヘルパー関数（例: cn 関数 - classnames と tailwind-merge を組み合わせる）。
actions.ts: Server Actions（例: addPostAction, likeAction, followAction）。フォーム送信やボタンクリックなどからサーバーサイドの処理（主に DB 更新）を呼び出すための関数。revalidatePath などでデータ更新後の再描画も制御。
user/userService.ts: ユーザー関連の DB 操作 (getCurrentLoginUserData)。
post/postService.ts: 投稿関連の DB 操作 (WorkspacePosts)。
prisma/: Prisma (データベース関連)

schema.prisma: データベースのモデル（テーブル構造）定義ファイル。
migrations/: DB スキーマの変更履歴。
public/: 静的ファイル

画像 (next.svg, vercel.svg, placeholder-user.jpg) など、ビルド時にそのまま配置されるファイル。
types/: TypeScript 型定義

user.ts: ユーザー関連のカスタム型定義 (UserData, UserProfile など)。
ルート直下のファイル: プロジェクト設定・構成

package.json: プロジェクト情報、依存関係 (dependencies, devDependencies)、スクリプト (dev, build など)。
next.config.mjs: Next.js の設定。
tailwind.config.ts: Tailwind CSS の設定。
tsconfig.json: TypeScript の設定。
middleware.ts: リクエストに対する共通処理 (Clerk の認証ミドルウェアを使用)。
.env / .env.local (ファイル一覧には .env のみ見えますが通常 .local を使用): 環境変数 (DB 接続情報、Clerk キー、Webhook シークレットなど)。
.gitignore: Git で無視するファイル・フォルダの指定。
その他 (postcss.config.mjs, components.json, README.md など): 各種ツール設定やドキュメント。
役割のまとめ:

app/: ユーザーが見る画面と URL の対応付け、API エンドポイントの定義。
components/: UI を作るための部品置き場。
lib/: アプリの裏側で動くロジックや、データベースとのやり取りを担当する関数群。
prisma/: データベースの設計図。
public/, types/, ルートファイル群: プロジェクトの構成、設定、静的リソース、型定義など。



# 技術スタック
主要技術スタックとバージョン:

フレームワーク:

Next.js: 14.2.4 - React ベースのフルスタックフレームワーク。App Router を使用しています。
言語:

TypeScript: ^5 - JavaScript に静的型付けを追加した言語。開発効率とコードの安全性を高めます。
UI ライブラリ:

React: ^18 - フロントエンドの UI を構築するための JavaScript ライブラリ。
React DOM: ^18 - React をブラウザで動作させるためのライブラリ。
認証・ユーザー管理:

Clerk: @clerk/nextjs: ^5.7.5 - ユーザー認証、サインアップ、サインイン、セッション管理などを提供するサービス。
データベース関連:

Prisma:
@prisma/client: ^5.16.1 - アプリケーションコードからデータベースを操作するためのクライアントライブラリ（ORM）。
prisma: ^6.5.0 (devDependencies) - Prisma のマイグレーション実行やクライアント生成などを行うためのコマンドラインツール (CLI)。
データベース本体: PostgreSQL - schema.prisma の datasource db { provider = "postgresql" } から判断。 Supabase 上でホストされているものを使用していますね。
スタイリング:

Tailwind CSS: ^3.4.1 - ユーティリティファーストな CSS フレームワーク。globals.css や各コンポーネントの className で使用。
PostCSS: ^8 - CSS の変換処理を行うツール（Tailwind CSS が内部で使用）。
tailwindcss-animate: ^1.0.7 - Tailwind CSS でアニメーションを簡単に追加するためのプラグイン。
UI コンポーネント (shadcn/ui 関連と推測):

Radix UI: @radix-ui/*: ^1.1.0 (例: react-avatar, react-slot, react-tabs) - アクセシビリティに配慮した高品質な UI プリミティブを提供するライブラリ。components/ui 内のコンポーネントのベースになっていると思われます。
Lucide React: ^0.399.0 - アイコンライブラリ (Icons.tsx で使われている可能性が高い)。
class-variance-authority: ^0.7.0 - コンポーネントのスタイルバリアントを管理するライブラリ (shadcn/ui でよく使われる)。
clsx: ^2.1.1 - CSS クラス名を結合するためのユーティリティ。
tailwind-merge: ^2.3.0 - Tailwind CSS のクラス名の衝突を解決・マージするユーティリティ。
Webhook 検証:

Svix: ^1.63.0 - Clerk からの Webhook リクエストの署名を検証するために使用。
バリデーション:

Zod: ^3.23.8 - TypeScript ファーストなスキーマ宣言・検証ライブラリ (actions.ts でフォーム入力の検証に使用)。
開発ツール:

ESLint: ^8, eslint-config-next: 14.2.4 - コードの静的解析ツール（品質チェックやスタイル統一）。
TypeScript Types: @types/* - 各種ライブラリの型定義ファイル。
Node.js バージョン:

20.15.1 - package.json の volta 設定から指定されている Node.js のバージョン。
まとめ:

このプロジェクトは、Next.js (App Router) + TypeScript をベースに、認証に Clerk、データベースに Supabase (PostgreSQL) + Prisma、スタイリングに Tailwind CSS、UI コンポーネント基盤に shadcn/ui (Radix UI + Lucide) を採用した、モダンで一般的な構成と言えます。Server Actions や Zod も活用されていますね。