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



# 実装イメージ
フェーズ 1: データベース (モデル) の準備

目標: ランキング機能に必要なデータを保存するためのテーブル構造を定義する。
作業:
schema.prisma ファイルを開く。
Sentiment Enum (LIKE/DISLIKE) を定義する。
RankingList モデル（リストのタイトル情報）を定義する ( sentiment, subject, description?, isPublic?, authorId (User.id参照), createdAt, updatedAt フィールドを含む)。 User モデルとのリレーションも定義。
RankedItem モデル（リスト内の各アイテム情報）を定義する ( itemName, rank, imageUrl?, linkUrl?, itemDescription?, listId, createdAt フィールドを含む)。RankingList モデルとのリレーション (onDelete: Cascade) も定義。
既存の User モデルに rankingLists: RankingList[] を追加してリレーションを定義。
itemName や subject, rank など、検索や表示で使いそうなフィールドにインデックス (@@index) を設定。
影響ファイル: prisma/schema.prisma
DBモデル: User (修正), RankingList (新規), RankedItem (新規), Sentiment (新規 Enum)
次のアクション: npx prisma migrate dev --name add_ranking_models を実行してDBにテーブルを作成し、Prisma Client を更新。
フェーズ 2: ランキングリスト作成機能 (UI & サーバーアクション)

目標: ユーザーが新しいランキングリスト（好き/嫌い選択 + テーマ入力）を作成できるようにする。
作業:
リスト作成用の Server Action (createRankingListAction) を作成する。
lib/actions/rankingActions.ts (新規作成) または既存の lib/actions.ts に追記。
入力 (sentiment, subject) を受け取り、認証 (auth()) でユーザーIDを取得。
clerkId から User の内部 id を検索。
prisma.rankingList.create を使ってデータを保存。
Zod などでバリデーションを追加。
エラーハンドリング。
成功したら revalidatePath で関連ページ（プロフィールなど）を再検証。
リスト作成フォームの UI コンポーネント (RankingListForm.tsx) を作成する。
components/component/ranking/ (新規作成) フォルダなどが適切か。
"use client" コンポーネント。
sentiment 用の選択肢（ラジオボタン等）と subject 用のテキスト入力。
useActionState (React) と createRankingListAction を連携させる。
送信ボタンには SubmitButton.tsx を利用。
リスト作成フォームを表示するためのページ（例: app/rankings/create/page.tsx）またはモーダルを作成。
影響ファイル: lib/actions/rankingActions.ts (新規 or 修正), components/component/ranking/RankingListForm.tsx (新規), app/rankings/create/page.tsx (新規 or 代替UI)
DBモデル: RankingList, User
フェーズ 3: ランキングアイテム追加・順位付け機能 (UI & サーバーアクション)

目標: 作成したリストにアイテム（アイテム名＋順位など）を追加・保存できるようにする。
作業:
アイテム追加用の Server Action (addRankedItemAction) を作成する。
lib/actions/rankingActions.ts に追記。
入力 (listId, itemName, rank など) を受け取り、認証と権限（リストの所有者か）をチェック。
prisma.rankedItem.create でデータを保存。バリデーション、エラーハンドリング、revalidatePath。
リスト編集画面の UI コンポーネント (RankingListEditView.tsx など) を作成。
components/component/ranking/ などに新規作成。
指定された listId のリスト情報と既存アイテム一覧を表示。
アイテム追加フォーム (RankedItemForm.tsx を作成または統合) を表示。
アイテムの順位 (rank) を入力できるようにする。
(将来的に) アイテムの編集・削除ボタンを追加。
(将来的に) ドラッグ＆ドロップなどの順位変更 UI を追加。
リスト編集画面を表示するためのページ（例: app/rankings/[listId]/edit/page.tsx）を作成。
影響ファイル: lib/actions/rankingActions.ts (修正), components/component/ranking/RankingListEditView.tsx (新規), components/component/ranking/RankedItemForm.tsx (新規), app/rankings/[listId]/edit/page.tsx (新規)
DBモデル: RankedItem, RankingList
フェーズ 4: プロフィールページでのランキング表示

目標: ユーザーのプロフィールページに、その人が作成したランキングリスト一覧を表示する。
作業:
指定されたユーザー名 (username) または clerkId に紐づく RankingList の一覧（タイトル、感情など）を取得する関数を lib/user/userService.ts に追加（例: getRankingListsByUser)。
app/profile/[username]/page.tsx を修正。
上記関数を呼び出してリストデータを取得。
取得したリストデータを表示用コンポーネントに渡す。
プロフィールにリスト一覧を表示するコンポーネント (ProfileRankingListDisplay.tsx など) を作成。
components/component/ranking/ などに新規作成。
リストのタイトルなどを表示。各リストの詳細ページへのリンクを設置。
(将来的に) リスト詳細表示ページ (app/rankings/[listId]/page.tsx) やモーダルを作成。
影響ファイル: lib/user/userService.ts (修正), app/profile/[username]/page.tsx (修正), components/component/ranking/ProfileRankingListDisplay.tsx (新規)
DBモデル: RankingList, User, RankedItem (詳細表示時)
フェーズ 5: ランキング作成時のタイムライン投稿機能

目標: ランキングリスト作成・保存時に、任意でタイムラインに報告を投稿できるようにする。
作業:
createRankingListAction (フェーズ2で作成) を修正。
フォームから「投稿するかどうか」と「追加コメント」を受け取る。
prisma.rankingList.create 成功後、もし投稿するオプションが有効なら、prisma.post.create を使って投稿データを作成（既存の addPostAction のロジックを参考・流用）。投稿内容にはリストへのリンクを含める。
RankingListForm.tsx (フェーズ2で作成) を修正。
「タイムラインに投稿する」チェックボックスと、コメント入力欄を追加。
影響ファイル: lib/actions/rankingActions.ts (修正), components/component/ranking/RankingListForm.tsx (修正)
DBモデル: Post, RankingList
サジェスト機能、みんなのランキング、トレンド機能は、これらのコア機能ができた後の次のステップとして実装していく形になります。

# ランキング機能追加する
・画像付き投稿
・タイトルとアイテムへのサジェスト機能
・他の人のランキングを見て自分も同じランキングを作る→ランキング作成ボタン

# みんなのtrend機能の実装
タブ項目
1. 検索機能 (ページ最上部)

表示: 検索キーワードを入力するための検索窓を表示します。
機能: ユーザーが入力したキーワードで、「ランキングのタイトル (subject)」および「ランキング内のアイテム名 (RankedItem.itemName)」を含む公開済みランキングを検索します。
結果表示: 検索結果として、該当したランキングのタイトルのみを新しい順に一覧表示します。
2. New タブ

表示: 公開済み (PUBLISHED) のランキングのタイトルのみを、作成日時が新しい順に一覧表示します。
目的: 新しく作成されたランキングをすぐに見つけられるようにします。
3. Total タブ (みんなのランキング)

初期表示: まず、公開済みランキングの中で**最も多く作成されているテーマ（subject）**を人気順（リスト数が多い順）に一覧表示します。
テーマ選択後: ユーザーがリストから特定のテーマを選択すると、そのテーマ（完全に同じタイトル）を持つ全ての公開済みランキングを集計します。そして、各アイテムがそれらのランキング全体で平均して何位にランク付けされているかを計算し、アイテムを平均順位の高い順に並べた「みんなのランキング」を表示します。（アイテム名の表記揺れは考慮せず、完全一致で集計します）
目的: 特定のテーマについて、世間一般でどのような順位付けがされているかの傾向を示します。（※平均順位の計算は実装がやや複雑になる点に留意）
4. Total Trends タブ

集計期間: 毎週日曜日の0時を起点とした1週間。
対象データ: その1週間の間に最終更新日時 (updatedAt) が含まれる公開済みランキングリスト。
表示: 対象となったランキングリストをテーマ (subject) ごとに集計し、リスト数が多かったテーマ順にテーマ名をランキング形式で一覧表示します。
目的: その週に活発に更新・作成された人気のテーマ（トレンドの話題）を示します。
5. For You タブ

表示内容 (パート1): まず、現在ログインしているユーザーが作成したランキングの一覧を表示します（下書きを含むか、公開済みのみかは getRankingDetailsForView の実装によりますが、おそらく両方表示するのが親切です）。表示形式はタイトル一覧でも、もう少し詳細（タイトル＋トップアイテムなど）でも良いでしょう。
表示内容 (パート2): 次に、パート1でリストアップされた「自分が作成したことのあるランキングのテーマ」について、「Total タブ」と同様の「みんなのランキング」（アイテムの平均順位順リスト）を表示します。つまり、「Total」タブの集計結果を、自分が関わったことのあるテーマだけに絞り込んで表示する形です。
目的: 自分の活動履歴を振り返りつつ、自分が関心のあるテーマについての全体的な傾向（みんなのランキング）を確認できるようにします。


検討すべきコアロジック

主に以下のロジック（またはそれを実現する関数）が必要になります。すべて**「感情(Sentiment) + テーマ(Subject)」のペア**をキーとして動作します。

(A) 人気テーマ一覧の取得ロジック: 公開済みランキングを (sentiment, subject) のペアでグループ化し、リスト数が多い順にそのペアの一覧を取得する。（Totalタブの初期表示用）
(B) 特定テーマの集計数取得ロジック: 指定された (sentiment, subject) のペアを持つ公開済みランキングの総数を取得する。（For You タブの「集計数」表示用、Total Trends の集計にも利用）
(C) みんなのランキング（平均順位）計算ロジック: 指定された (sentiment, subject) のペアを持つ全ての公開済みランキングからアイテム情報を集め、各アイテムの平均順位を計算し、その順位でアイテムリストを生成する。（Totalタブのテーマ選択後表示用、For You タブのリンク先表示用）
(D) 週間トレンドテーマ取得ロジック: 期間内に更新された公開済みランキングを (sentiment, subject) ペアで集計し、リスト数が多い順にペアの一覧を取得する。（Total Trends タブ用）


完成イメージ
+----------------------------------------+  <-- 画面上部
| Header: ロゴ | [ トレンド検索 🔍 ] | [👤] |  (ヘッダー内に検索窓: 固定)
+----------------------------------------+
| | New | Total | Trends | ForYou|      |  (タブ選択)
+========================================+  <-- ここから下がスクロールする可能性のあるエリア
|                                        |
|       (ここに選択したタブの内容)         |
|                                        |
|  【例: 'New' タブ選択時】              |
|  ------------------------------------  |
|  最新のランキングタイトル 1             |
|  ------------------------------------  |
|  ... (下にスクロール) ...              |
|                                        |
|                                    [+] |  (フローティングボタン: 固定)
|                                    [👑] |  (フローティングボタン: 固定)
+========================================+  <-- スクロールエリアの見た目上の終わり / FAB配置
| | 🏠 |  🔍 |  ❤️  |  🔔  |  👤  |      |  (ボトムナビゲーションバー: 固定)
+----------------------------------------+  <-- 画面下部


