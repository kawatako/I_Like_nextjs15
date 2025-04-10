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
### lib/actions/
・データベースのデータを変更する（作成、更新、削除 - CRUD の CUD）
・メール送信、外部API呼び出しなど、データ変更以外の副作用を伴う処理。
・クライアントコンポーネント（フォーム送信、ボタンクリック、無限スクロールなど）から直接呼び出され、サーバー側で実行される必要のある処理 (サーバーアクション）。
⇒getPaginatedFollowing など、クライアント側の要求に応じてデータを取得して返す関数も、この「クライアントから呼び出されるサーバー側処理」という性質を持つため、ここに含めるのが一般的です。
・必須事項: ファイルの先頭に "use server"; を記述する必要があります。

### lib/data/ ディレクトリに置く関数: (または lib/services/, lib/queries/ など)
・主にデータベースからデータを取得・読み取りする（CRUD の R）。データの集計や整形なども含みます。
・主にサーバーコンポーネント（page.tsx, layout.tsx など）から、ページの初期表示（サーバーサイドレンダリング時）に直接呼び出される関数。
・他のサーバーアクション（lib/actions/ 内の関数）や、同じ lib/data/ 内の別の関数から内部的に呼び出される純粋なデータ取得・加工ロジック。
"use server";: これらの関数がサーバーコンポーネントや他のサーバーサイド関数からのみ呼び出される場合は、"use server"; は必須ではありません。（ただし、将来的にクライアントから呼び出す可能性が出てきた場合に備えて、あるいは規約としてファイル単位で付けておくことも間違いではありません。）

ポイント:「誰が（どこから）その関数を呼ぶか？」 と 「その関数は何をするか（データ変更か、取得か）？」 が主な判断基準になります。
クライアントからの直接呼び出しが必要な場合は、たとえデータ取得のみであっても、サーバーアクションとして扱い lib/actions/ に置くのが、Next.js App Router の仕組みとしては自然です。


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
機能: ユーザーが入力したキーワードで、「タイトル (subject)」および「ランキング内のアイテム名 (RankedItem.itemName)」を含む公開済みランキングを検索します。
検索条件ロジックとしては完全一致ではなくて、一部分が含まれていればヒットするようにする。
例えば、タイトルが朝ご飯だった場合、ご飯で検索した場合も検索結果にヒットする仕様。
結果表示: 検索結果として、該当したランキングのタイトルのみを新しい順に一覧表示。

2. New タブ
表示: 公開済み (PUBLISHED) のランキングのタイトルのみを、作成日時が新しい順に一覧表示します。
目的: 新しく作成されたランキングをすぐに見つけられるようにします。

3. Total タブ (みんなのランキング)
初期表示: まず、公開済みランキングの中で最も多く作成されている、感情+タイトル（sentiment + subject)を人気順（リスト数が多い順）に一覧表示します。
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

## 統合タイムライン (TL) 機能
機能の概要:
アプリのホーム画面となるメインフィードです。
ログインユーザーがフォローしている他のユーザーの活動（短文投稿、ランキングの公開/更新、リツイート等）を時系列（新しい順）に表示します。
短文投稿、ランキング更新など、活動の種類に応じて異なる見た目のカードで表示されます。
下にスクロールすることで過去の活動を読み込めます（無限スクロール）。

実装方針:
データベースモデル:
FeedItem モデルを新規作成します。主なフィールドは id, userId (活動した人), type (活動の種類を示す Enum: POST, RANKING_UPDATE, RETWEET など), postId (任意、type=POST用), rankingListId (任意、type=RANKING_UPDATE用), retweetOfFeedItemId (任意、type=RETWEET用), quotedFeedItemId (任意、type=QUOTE_RETWEET用), createdAt。
FeedType Enum を定義します (POST, RANKING_UPDATE, RETWEET, QUOTE_RETWEET など)。
既存の Post モデルは主に短文投稿の本文 (content) を保持します。
データ作成ロジック:
ユーザーが短文投稿 (B) を作成 → Post レコードと FeedItem (type: POST) レコードを作成。
ユーザーがランキング (A) を公開/更新 → RankingList を更新し、同時に FeedItem (type: RANKING_UPDATE) レコードを作成。
ユーザーがリツイート/引用リツイート → 対応する FeedItem (type: RETWEET / QUOTE_RETWEET) レコードを作成（引用コメントは別途 Post に保存）。
データ取得ロジック (lib/data/feedQueries.ts などに作成):
getHomeFeed(userId, options): ログインユーザー (userId) がフォロー中のユーザーリストを取得し、それらのユーザーの FeedItem を createdAt 順（降順）で取得する関数。include を使って、type に応じた関連データ（Post や RankingList、リツイート元の FeedItem など）も一緒に取得する。ページネーション (take, skip/カーソル) も考慮する。
UIコンポーネント:
app/(home)/page.tsx (サーバー): getHomeFeed で初期データを取得し、MainContent へ渡す。
MainContent.tsx: PostForm と TimelineFeed を表示。
TimelineFeed.tsx (クライアント): 初期データを表示し、無限スクロールなどの追加読み込みを実装。FeedItem の配列を map し、item.type に応じて異なるカードコンポーネント（<StatusUpdateCard />, <RankingUpdateCard />, <RetweetCard /> など）を条件付きでレンダリングする。
各種カードコンポーネント: それぞれの FeedItem タイプに応じた情報を適切に表示する。
+----------------------------------------+  <-- 画面上部
| Header (ロゴ, 検索窓, ユーザーアイコン) |  (常に表示: 固定)
+----------------------------------------+  <-- ここから下がスクロールエリア
| +------------------------------------+ |
| | [👤] いまどうしてる？              | | --- 短文投稿フォーム ---
| +------------------------------------+ |
+----------------------------------------+
|                                        | --- タイムライン (TL) ---
|  +-----------------------------------+ |
|  | User B @userb • 5分前             | | --- ★ 引用リツイートの例 ★ ---
|  |                                   | |
|  | このランキング最高！ 分かる！       | | (コメント部分 - Post)
|  | +-------------------------------+ | |
|  | | 🔁 User A @usera • 10分前     | | | --- ↓ 引用元 (ランキング更新) ↓ ---
|  | | [👑] 好きな 作業用BGM を公開  | | | (FeedItem -> RankingList)
|  | |   1. Lo-fi Hip Hop Radio    | | |
|  | |   2. ヒーリングミュージック | | |
|  | |   (クリックで詳細表示)       | | |
|  | +-------------------------------+ | |
|  | [💬][🔁][❤️][🔗]                 | | (引用リツイートへのアクション)
|  +-----------------------------------+ |
|                                        |
|  +-----------------------------------+ |
|  | 🔁 User C @userc がリツイート     | | --- ★ リツイートの例 ★ ---
|  | User A @usera • 15分前            | |
|  | [👑] 好きな 作業用BGM を公開     | | (FeedItem -> RankingList)
|  |   1. Lo-fi Hip Hop Radio       | |
|  |   2. ヒーリングミュージック    | |
|  |   (クリックで詳細表示)        | |
|  | [💬][🔁][❤️][🔗]                 | | (リツイート(元)へのアクション)
|  +-----------------------------------+ |
|                                        |
|  +-----------------------------------+ |
|  | User B @userb • 20分前            | | --- ★ 短文投稿の例 ★ ---
|  |                                   | |
|  | 今日は四日市も良い天気ですね！☀️    | | (FeedItem -> Post)
|  |                                   | |
|  | [💬][🔁][❤️][🔗]                 | | (投稿へのアクション)
|  +-----------------------------------+ |
|                                        |
|  +-----------------------------------+ |
|  | User A @usera • 25分前            | | --- ★ ランキング更新の例 ★ ---
|  |                                   | |
|  | [👑] 嫌いな プログラミング言語 公開| | (FeedItem -> RankingList)
|  |   1. PHP                        | |
|  |   2. VBA                        | |
|  |   (クリックで詳細表示)        | |
|  | [💬][🔁][❤️][🔗]                 | | (ランキング更新投稿へのアクション)
|  +-----------------------------------+ |
|                                        |
|  ... (下にスクロールすると古い項目) ... |
|                                        |
|                                    [+] |  (フローティングボタン: 固定)
|                                    [👑] |  (フローティングボタン: 固定)
+========================================+  <-- スクロールエリア終端 / FAB配置
| | 🏠 |  🔍 |  ❤️  |  🔔  |  👤  |      |  (ボトムナビゲーションバー: 固定)
+----------------------------------------+  <-- 画面下部


## フォロー関連機能 実装概要・方針まとめ
・Follows/[username]/page.tsxを作り、タブでfollows、followers、フォローリクエストに閲覧切り替えできるようにする。
・Followボタンを作りサイドバーに表示してクリックしたら自分のFollows/[username]page.tsxに移動する導線
・プロフィールページに、そのユーザーのフォロー数、フォロワー数を表示
フォロー数、フォロワー数のボタンを押したらそのユーザーのFollows/[username]page.tsxに移動する導線
を伴う

1. コア機能: フォロー/アンフォロー、鍵垢、承認制
機能概要:
ユーザーは他のユーザーをフォロー/アンフォローできる。
ユーザーは自身のアカウントを非公開（鍵垢）に設定できる。
公開アカウントは誰でもフォロー可能。
非公開アカウントへのフォローは、相手による承認が必要となる（フォローリクエスト）。
承認されると正式にフォロー関係が成立する。
実装方針:
データベース (Prisma Schema):
User モデル: isPrivate Boolean @default(false) フィールドを追加。
Follow モデル (既存): 承認済みのフォロー関係（followerId, followingId）を記録。
FollowRequest モデル (新規): フォローリクエスト（requesterId (申請者), requestedId (申請先), status (Enum: PENDING)）を記録。@@unique([requesterId, requestedId]) 制約追加。
User モデルに FollowRequest へのリレーション (sentFollowRequests, receivedFollowRequests) を追加。
prisma migrate dev でDBに変更を適用。
サーバーアクション (lib/actions/followActions.ts - 新規):
followUser(targetUserId): ターゲットの isPrivate を確認。公開なら Follow 作成。非公開なら FollowRequest 作成/更新 (upsert)。重複フォロー/リクエスト防止チェック含む。
unfollowUser(targetUserId): Follow レコード削除。
cancelFollowRequest(targetUserId): 送信した FollowRequest を削除。
acceptFollowRequest(requesterId): 受信したリクエストを承認。FollowRequest を削除し、Follow レコードを作成。トランザクション処理推奨。
rejectFollowRequest(requesterId): 受信したリクエストを拒否。FollowRequest を削除（またはステータス更新）。
updateProfilePrivacy(isPrivate: boolean): ユーザーが自身の isPrivate 設定を変更するアクション (これは userActions.ts でも良い)。
データ取得 (lib/data/followQueries.ts - 新規 or userQueries.ts):
getFollowStatus(viewerId, targetId): 2ユーザー間のフォロー状態（未フォロー/フォロー中/リクエスト送信済み/リクエスト受信中/自分自身）を確認する。isPrivate, Follow, FollowRequest を参照。
getPendingFollowRequests(userId): 自分宛の未処理フォローリクエスト一覧を取得。
UIコンポーネント:
プロフィールページ: getFollowStatus の結果に基づき、「フォローする」「フォロー中」「リクエスト済み」「承認/拒否」などの状態に応じたボタンを表示し、各アクションに接続。
設定ページ: アカウントの公開/非公開を切り替える UI (トグルスイッチなど)。
通知ページ/エリア: フォローリクエスト一覧と承認/拒否ボタン。
2. フォロワー数・フォロー中数の表示

機能概要:
ユーザープロフィールページ等で、そのユーザーのフォロワー数とフォロー中のユーザー数を表示する。
実装方針:
データベース (Prisma Schema): 既存の Follow モデルを利用。
サーバーアクション: 不要。
データ取得 (lib/data/userQueries.ts 内の getUserProfileData を拡張):
getUserProfileData 関数内で、ユーザー情報を取得する際に Prisma の _count 機能を使って followedBy (フォロワー) と following (フォロー中) の数を同時に取得するように include (または select) を変更する。
コード スニペット

// getUserProfileData 内の include または select に追加
_count: {
  select: {
    followedBy: true, // フォロワー数
    following: true   // フォロー中数
  }
}
UIコンポーネント:
プロフィールページ: getUserProfileData から取得した _count.followedBy と _count.following の値を表示。クリックするとフォロワー/フォロー中一覧ページ（またはモーダル）に遷移するリンクにするのが一般的。
3. フォロー/承認に関する通知

機能概要:
フォローされた時、フォローリクエストが来た時、フォローリクエストが承認/拒否された時などに、ユーザーに通知（アプリアイコンにバッジ表示、通知一覧など）を行う。
実装方針:
データベース (Prisma Schema):
Notification モデルを新規作成。主なフィールド: id, recipientId (通知を受け取る人), actorId? (アクションを起こした人), type (Enum: NEW_FOLLOWER, FOLLOW_REQUEST, REQUEST_ACCEPTED など), relatedFollowId?, relatedFollowRequestId?, relatedPostId?, relatedRankingListId? 等の関連ID (任意), isRead (Boolean, default: false), createdAt。
NotificationType Enum を定義。
User モデルに Notification へのリレーション (notifications) を追加。
サーバーアクション (既存のアクションを修正):
followUser アクション内: 公開アカウントをフォロー成功時、相手 (targetUserId) に type: NEW_FOLLOWER の Notification を作成。
followUser アクション内: 非公開アカウントへリクエスト送信時、相手 (targetUserId) に type: FOLLOW_REQUEST の Notification を作成。
acceptFollowRequest アクション内: リクエストを送信した側 (requesterId) に type: REQUEST_ACCEPTED の Notification を作成。
rejectFollowRequest アクション内: （任意）リクエスト送信側に拒否通知を作成。
データ取得 (lib/data/notificationQueries.ts - 新規):
getNotifications(userId, options): 未読/既読、ページネーションなどを考慮して、ユーザー宛の通知一覧を取得。include で actor (User) の情報も取得。
getUnreadNotificationCount(userId): 未読通知数を取得（ヘッダーのバッジ表示用）。
markNotificationAsRead(notificationId, userId): 通知を既読にするアクション（これは notificationActions.ts かも）。
markAllNotificationsAsRead(userId): 全通知を既読にするアクション。
UIコンポーネント:
ヘッダー (Header.tsx): BellIcon の近くに未読通知件数を表示するバッジ。クリックで通知一覧ドロップダウンや通知ページへ遷移。
通知一覧ドロップダウン/ページ: getNotifications で取得したデータを表示。通知の種類に応じてメッセージを生成。「既読にする」機能。
4. ブロック機能

機能概要:
特定のユーザーをブロックし、相手からのフォロー、自分の投稿/プロフィールの閲覧（相手が非公開の場合）、メンション、コメントなどをできなくする。
ブロックした/されたユーザーは互いのタイムラインに表示されなくなる。
実装方針:
データベース (Prisma Schema):
Block モデルを新規作成。主なフィールド: blockerId (ブロックした人), blockedId (ブロックされた人), createdAt。@@id([blockerId, blockedId]) で複合主キー（または @@unique）。
User モデルに Block へのリレーション (blocking, blockedBy) を追加。
サーバーアクション (lib/actions/blockActions.ts - 新規):
blockUser(targetUserId): Block レコードを作成。相手をフォロー中なら Follow も削除、フォローリクエストがあれば削除。
unblockUser(targetUserId): Block レコードを削除。
データ取得 (既存のクエリ関数を修正):
重要: getHomeFeed, getUserProfileData, getFollowers, getFollowing, searchRankings など、ユーザーやコンテンツ一覧を取得するほぼ全てのクエリ関数で、ブロック関係を考慮するように where 句を修正する必要があります。
例: getHomeFeed では、取得する FeedItem の userId が「自分がブロックしたユーザー」や「自分をブロックしたユーザー」に含まれていないことを確認。
例: getUserProfileData では、プロフィール所有者が自分をブロックしていたら null を返すなど。
getFollowStatus もブロック状態を返すように修正 (BLOCKED, BLOCKING)。
UIコンポーネント:
プロフィールページ: ブロック/ブロック解除ボタンを追加。フォローボタンとの表示ロジックを連携。
設定ページ: ブロック中のユーザー一覧を表示・管理する画面（任意）。
5. 相互フォロー表示

機能概要:
相手のプロフィールページなどで、相手も自分をフォローしている場合に「フォローされています」「相互フォロー」のような表示を行う。
実装方針:
データベース (Prisma Schema): 追加・変更は不要。既存の Follow モデルを利用。
サーバーアクション: 不要。
データ取得 (lib/data/followQueries.ts の getFollowStatus を活用):
getFollowStatus(viewerId, targetId) 関数が、自分が相手をフォローしているか (FOLLOWING) と、相手が自分をフォローしているか（これは別途 prisma.follow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: viewerId } } }) で確認するか、getFollowStatus 内で両方向チェックする）の両方を確認できるようにする。
UIコンポーネント:
プロフィールページ: getFollowStatus (または関連するチェック) の結果に基づき、「フォローされています」バッジなどをフォローボタンの近くに表示する。


## 投稿への「いいね」機能
機能の概要:
タイムライン上の短文投稿 (type: POST の FeedItem) に対して「いいね」できます。
いいねは何度でも付け外しできます。
投稿にいいねが付いている数や、誰がいいねしたかを確認できます（任意）。
実装方針:
データベースモデル: 既存の Like モデル (userId, postId) をそのまま利用します。これは Post モデルに紐づいています。
サーバーアクション (lib/actions/likeActions.ts を新規作成):
likePost(postId): 指定された postId に対する Like レコードを作成します（重複作成しないように注意）。
unlikePost(postId): 指定された postId に対する Like レコードを削除します。
データ取得ロジック (lib/data/likeQueries.ts や postQueries.ts を新規作成):
getLikeCountForPost(postId): 特定の投稿のいいね数を取得。
didUserLikePost(userId, postId): 特定ユーザーがいいね済みか確認。
getUsersWhoLikedPost(postId): いいねしたユーザー一覧を取得（任意）。
UIコンポーネント:
<StatusUpdateCard /> (短文投稿用カード) 内に「いいね」ボタン（❤️アイコン）を設置します。
ボタンの初期状態（いいね済みか/まだか）は、didUserLikePost の結果で決まります。このデータはタイムライン表示時に一緒に取得するか、クライアントサイドで追加取得します（後者の方が一般的ですが、パフォーマンス考慮が必要）。
ボタンクリックで likePost / unlikePost アクションを呼び出します。UIを即座に更新する「楽観的更新(Optimistic Update)」も検討します。
いいね数をボタンの横などに表示します。


推奨される実装順序:

この依存関係を考えると、以下の順番で実装を進めるのがスムーズかと思います。

フォロー/フォロワー機能 (基本部分):

まず、ユーザー間のフォロー関係を記録できるようにします。schema.prisma に必要なモデル（Follow は既にありますが、承認制にするなら FollowRequest や User の isPrivate 等）を定義・修正します。
誰が誰をフォローしているか (getFollowingIds 関数など) を取得できるようにします。これがタイムライン表示の基礎になります。
ユーザーが他のユーザーをフォロー/アンフォローできる基本的なサーバーアクション (followUser, unfollowUser) と、それを呼び出すための簡単なUI（例: プロフィールページのボタン）を実装します。
承認機能の複雑な部分は、まずは後回しにして、公開アカウント同士のフォローから実装するのも手です。
FeedItem モデル定義と作成ロジック:

schema.prisma に FeedItem モデルと FeedType Enum を定義し、マイグレーションを実行します。
既存の「短文投稿作成アクション」と「ランキング公開/更新アクション (saveRankingListItemsAction)」を修正し、それぞれの処理が完了した際に、対応する FeedItem レコードも同時に作成するようにします。
統合タイムライン (TL) 機能:

ステップ1と2で準備したフォロー情報と FeedItem を使って、ホーム画面にタイムラインを表示する機能を実装します。
getHomeFeed 関数を作成し、フォロー中のユーザーの FeedItem を取得します。
TimelineFeed コンポーネントを作成し、FeedItem の type に応じて異なるカード (StatusUpdateCard, RankingUpdateCard) を表示し分けます。
（無限スクロールなどのページネーションは、基本的な表示ができてからでOKです）
投稿への「いいね」機能:

タイムライン上に短文投稿 (StatusUpdateCard) が表示されるようになったら、そこに「いいね」ボタンを追加し、likePost, unlikePost アクションや didUserLikePost クエリを使って機能を実装します。
フォロー/フォロワー機能 (発展):


1. 投稿機能 (Post)
機能概要:
ユーザーが短いテキストメッセージを投稿できる基本的な機能。
将来的には、投稿に画像を1枚添付できるようにする。
作成された投稿は、個別の投稿ページやユーザープロフィール、そしてタイムラインに表示される。
関連モデル:
User: 投稿を作成したユーザー（投稿者）。
Post: 投稿の本体。主なフィールドは id, content (本文), authorId (投稿者ID), imageUrl (任意: 添付画像のURL), createdAt, updatedAt。
FeedItem: 投稿が行われた際に、タイムライン表示用に作成されるレコード (type は POST)。postId フィールドで関連する Post を指す。
Like: 投稿に対する「いいね」を記録（直接的ではないが関連）。
Reply: 投稿に対する返信を記録（直接的ではないが関連）。
実装する主な関数/コンポーネント概要:
PostForm.tsx (Client Component):
テキスト入力エリア。
（将来）画像アップロードボタン/プレビューエリア。
投稿を実行するボタン。
入力内容を Server Action に渡す。
createPostAction (Server Action):
PostForm からデータ（テキスト、画像ファイル）を受け取る。
認証チェック（ログインしているか）。
入力値のバリデーション。
（画像がある場合）画像をクラウドストレージ等にアップロードし、URLを取得する。
Post レコードをデータベースに作成（content, authorId, imageUrl を保存）。
同時に FeedItem レコードをデータベースに作成 (type: POST, userId: authorId, postId: 作成したPostのID)。
関連ページのキャッシュ再検証 (revalidatePath) を行う。
（表示用コンポーネント）:
投稿単体を表示するコンポーネント（例: PostCard.tsx）: 投稿内容、投稿者情報、画像、アクションボタン（いいね、返信、リツイート等）を表示。
投稿リストを表示するページ/コンポーネント（例: プロフィールページの一部）。
2. タイムライン機能 (TL)
機能概要:
アプリのホーム画面となるメインフィード。
ログインユーザーがフォローしているユーザー（＋自分自身）の活動（投稿、ランキング公開/更新、リツイート、引用リツイート等）を**時系列（新しい順）**に表示する。
活動の種類 (FeedItem の type) に応じて、異なる見た目のカードで表示する。
無限スクロールに対応し、下にスクロールすることで過去の活動を読み込む。
関連モデル:
User: タイムラインの持ち主（ログインユーザー）、各活動を行ったユーザー。
Follow: ログインユーザーが誰をフォローしているかを特定するために使用。
FeedItem: ✨ TL機能の中核。タイムラインに表示される各項目を表す。userId (活動者), type (活動種別), createdAt (活動日時) と、活動に応じた関連ID (postId, rankingListId, retweetOfFeedItemId, quotedFeedItemId) を持つ。
Post: FeedItem (type: POST or QUOTE_RETWEET) が参照する投稿内容。
RankingList: FeedItem (type: RANKING_UPDATE) が参照するランキング情報。
FeedType (Enum): FeedItem の type が取りうる値の定義。
実装する主な関数/コンポーネント概要:
getHomeFeed (lib/data/feedQueries.ts):
ログインユーザーID (userId) を受け取る。
Follow テーブルを使い、userId がフォローしているユーザーのIDリストを取得。
フォロー中のユーザーIDリスト＋自分のIDを条件に、該当する FeedItem を createdAt 降順で取得する。
include を使って、FeedItem の type に応じた関連データ（Post, RankingList, リツイート/引用元の FeedItem とその先のデータ）をまとめて取得する。
カーソルベースのページネーション（take, cursor）を実装する。
app/(home)/page.tsx (Server Component):
ログインユーザーのIDを取得する。
getHomeFeed を呼び出して、タイムラインの初期表示データを取得する。
取得したデータを TimelineFeed コンポーネントに渡す。
TimelineFeed.tsx (Client Component):
初期データ (FeedItem 配列) を props で受け取り表示する。
FeedItem 配列を map し、item.type に応じて <StatusUpdateCard />, <RankingUpdateCard />, <RetweetCard />, <QuoteRetweetCard /> 等のカードコンポーネントを条件付きでレンダリングする。
無限スクロールを実装: スクロール位置を監視し、末尾に近づいたら getHomeFeed を呼び出す Server Action を実行して次のページのデータを取得し、表示中の FeedItem 配列に追加（state更新）する。
各種カードコンポーネント (<StatusUpdateCard />, <RankingUpdateCard />, etc.):
それぞれの FeedItem タイプに応じたデータを props で受け取り、整形して表示する。
例: <QuoteRetweetCard /> は、引用コメント(Post)と引用元の FeedItem の両方のデータを表示する。
各カード内にアクションボタン（いいね、リツイート等）を配置する。
リツイート/引用リツイート関連の Server Action (retweetAction, quoteRetweetAction):
リツイート/引用リツイートの操作を受け付け、対応する FeedItem (type: RETWEET or QUOTE_RETWEET) を作成する。引用リツイートの場合は、コメントを Post として作成する処理も含む。
3. タイムラインの完成イメージ (|- を使用)
|- Header (ロゴ, 検索, ユーザーアイコン) [固定]
|
|- (スクロールエリア開始)
|  |- PostForm (いまどうしてる？ テキスト入力, 画像添付ボタン)
|  |
|  |- TimelineFeed (以下、FeedItem の例)
|  |  |- QuoteRetweetCard (User B が User A のランキング更新を引用RT)
|  |  |  |- User B の情報 (アイコン, 名前, ID, 時刻)
|  |  |  |- User B のコメント本文 (Post.content)
|  |  |  |- (もしあれば) User B が添付した画像 (Post.imageUrl)
|  |  |  |- (引用元エリア)
|  |  |  |  |- User A の情報
|  |  |  |  |- [👑] ランキングタイトル (RankingList.subject)
|  |  |  |  |- ランキングの一部内容 (例: 1位, 2位)
|  |  |  |- アクションボタン (💬, 🔁, ❤️, 🔗)
|  |  |
|  |  |- RetweetCard (User C が User A のランキング更新をRT)
|  |  |  |- リツイートした User C の情報
|  |  |  |- (リツイート元エリア)
|  |  |  |  |- User A の情報 (アイコン, 名前, ID, 時刻)
|  |  |  |  |- [👑] ランキングタイトル (RankingList.subject)
|  |  |  |  |- ランキングの一部内容
|  |  |  |- アクションボタン (💬, 🔁, ❤️, 🔗) - ※元の投稿へのアクション
|  |  |
|  |  |- StatusUpdateCard (User B の投稿)
|  |  |  |- User B の情報 (アイコン, 名前, ID, 時刻)
|  |  |  |- 投稿本文 (Post.content)
|  |  |  |- (もしあれば) 添付画像 (Post.imageUrl)
|  |  |  |- アクションボタン (💬, 🔁, ❤️, 🔗)
|  |  |
|  |  |- RankingUpdateCard (User A のランキング更新)
|  |  |  |- User A の情報 (アイコン, 名前, ID, 時刻)
|  |  |  |- [👑] ランキングタイトル (RankingList.subject)
|  |  |  |- ランキングの説明 (RankingList.description)
|  |  |  |- ランキングの一部内容
|  |  |  |- アクションボタン (💬, 🔁, ❤️, 🔗)
|  |
|  |- (下にスクロールでさらに古い FeedItem が読み込まれる)
|
|- Floating Action Button (投稿[+] / ランキング作成[👑]) [固定]
|
|- Bottom Navigation Bar (🏠, 🔍, ❤️, 🔔, 👤) [固定]



他の種類のタイムライン項目（カード）の実装:

ランキング更新 (RANKING_UPDATE) を表示する <RankingUpdateCard /> を作成する。
リツイート (RETWEET) を表示する <RetweetCard /> を作成する。
引用リツイート (QUOTE_RETWEET) を表示する <QuoteRetweetCard /> を作成する。
作成したカードを TimelineFeed.tsx の switch 文に組み込んでいく。

無限スクロール機能の完成:
TimelineFeed.tsx の loadMoreItems 関数を完成させる。
次のページのデータを取得するための Server Action (loadMoreFeedItemsAction のような名前で) を作成する。このアクションはカーソルを受け取り、内部で getHomeFeed を呼び出して結果を返す。
TimelineFeed.tsx で Server Action を呼び出し、取得したデータを既存のリストに追加し、カーソルを更新するロジックを実装する。