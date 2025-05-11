// lib/types.ts

/** ランキングのステータス */
export type ListStatus = "DRAFT" | "PUBLISHED";

/** フィードの種類 */
export type FeedType = "POST" | "RANKING_UPDATE" | "RETWEET" | "QUOTE_RETWEET";

/** フォローリクエストのステータス */
export type FollowRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
/// フォローリクエストのステータスを表す型
export type FollowStatus =
  | "SELF"
  | "NOT_FOLLOWING"
  | "FOLLOWING"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"
  | "BLOCKED"
  | "BLOCKED_BY"
  | "CANNOT_FOLLOW";

export type TrendPeriod =
  "WEEKLY" | "MONTHLY";

/** 無限スクロール等で使う共通レスポンス */
export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Server Action の汎用戻り値 */
export type ActionResult = {
  success: boolean;
  error?: string;
  [key: string]: any;
};

/** ユーザーの最小限スニペット */
export interface UserSnippet {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

/** 投稿＋メタ情報 */
export interface PostWithData {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: UserSnippet;
  _count: { replies: number };
  likes: { userId: string }[];
  likeCount: number;
}

/** ランキングリストのアイテム（上位数件） */
export interface RankingListItemSnippet {
  id: string;
  rank: number;
  itemName: string;
  imageUrl: string | null;
}

/** ランキングリスト概要 */
export interface RankingListSnippet {
  id: string;
  subject: string;
  description: string | null;
  listImageUrl: string | null;
  status: ListStatus;
  displayOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  items: RankingListItemSnippet[];
  likes: { userId: string }[];
  likeCount: number;
  _count: { items: number };
}

/** ランキングリスト詳細表示用 */
export interface RankingListViewData {
  id: string;
  subject: string;
  description: string | null;
  status: ListStatus;
  listImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  author: UserSnippet;
  items: {
    id: string;
    rank: number;
    itemName: string;
    itemDescription: string | null;
    imageUrl: string | null;
  }[];
  tags: { id: string; name: string }[];
  _count: { items: number };
}

/** ランキング編集ページ用 */
export interface RankingListEditableData {
  id: string;
  subject: string;
  description: string | null;
  status: ListStatus;
  listImageUrl: string | null;
  author: { id: string; username: string };
  items: {
    id: string;
    rank: number;
    itemName: string;
    itemDescription: string | null;
    imageUrl: string | null;
  }[];
  tags: { id: string; name: string }[];
}

/** プロフィールページでのユーザーデータ */
export interface UserProfileData {
  id: string;
  clerkId: string;
  username: string;
  image: string | null;
  name: string | null;
  bio: string | null;
  coverImageUrl: string | null;
  location: string | null;
  birthday: Date | null;
  socialLinks: Record<string, string> | null;
  rankingLists: RankingListSnippet[];
  _count: {
    following: number;
    followedBy: number;
  };
}

/** SWR の key 型: ホーム／プロフィール両フィード用 */
export type FeedKey =
  | ["homeFeed", string | null, string | null]
  | ["profileFeed", string, string | null];

/** FeedItem＋関連情報 */
export interface FeedItemWithRelations {
  id: string;
  type: FeedType;
  createdAt: Date;
  updatedAt: Date;
  user: UserSnippet;
  post?: PostWithData | null;
  rankingList?: RankingListSnippet | null;
  retweetOfFeedItem?: FeedItemWithRelations | null;
  quotedFeedItem?: FeedItemWithRelations | null;
  quoteRetweetCount: number;
  _count: { retweets: number };
}

// getFollowStatus が返す情報の型
export interface FollowStatusInfo {
  status: FollowStatus;
  targetUserId: string;
  targetUsername: string;
  targetIsPrivate: boolean;
  followRequestId?: string;  // フォローリクエスト送信済みの場合のリクエストID
}

// フォロー／フォロー解除／リクエスト承認・拒否などのアクション結果に含めるステータス
export interface FollowActionResult extends ActionResult {
  status?: "following" | "not_following" | "requested" | "error";
}

// フォローリクエストを一覧取得するときの型
export interface FollowRequestWithRequester {
  id: string;
  requesterId: string;
  requestedId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
  requester: UserSnippet;
}

// フォロー一覧ページ／タブで使うアイテム型
// 「フォロー中」「フォロワー」どちらも UserSnippet の配列を返すので追加不要ですが
// カーソル用に id（follow テーブルのレコードID）を含める場合は
export interface FollowCursorRecord {
  id: string;         // follow テーブルのレコードID（カーソル用）
  user: UserSnippet;  // following または follower の user 情報
}