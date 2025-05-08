// components/hooks/useCardInteraction.ts
// feed/cardsで使うカスタムhooks
"use client";

import {
  useState,
  useTransition,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
  useEffect,
} from "react";
import { useSWRConfig } from "swr";
import { useToast } from "@/components/hooks/use-toast";
import type {
  FeedItemWithRelations,
  ActionResult,
  UserSnippet,
  PostWithData,
  RankingListSnippet,
} from "@/lib/types";
import { Prisma, FeedType } from "@prisma/client";
import {
  retweetAction,
  deleteQuoteRetweetAction,
  undoRetweetAction,
  // deletePostAction // 未実装のためコメントアウト
} from "@/lib/actions/feedActions";
import { deletePostAction } from "@/lib/actions/postActions"; // 実装済みと仮定

// カスタムフックが返す値の型定義
interface UseCardInteractionReturn {
  user: UserSnippet | null; // ★ null の可能性を許容 ★
  post: PostWithData | null;
  rankingList: RankingListSnippet | null;
  originalItem:
    | FeedItemWithRelations["retweetOfFeedItem"]
    | FeedItemWithRelations["quotedFeedItem"]
    | null;
  createdAt: Date | null; // ★ null の可能性を許容 ★
  feedItemId: string | null; // ★ null の可能性を許容 ★
  type: FeedType | null; // ★ null の可能性を許容 ★
  isOwner: boolean;
  likeTargetType: "Post" | "RankingList" | null;
  likeTargetId: string | null;
  initialLiked: boolean;
  likeCount: number;
  commentCount: number;
  retweetCount: number;
  quoteRetweetCount: number;
  isRetweetDialogOpen: boolean;
  setIsRetweetDialogOpen: Dispatch<SetStateAction<boolean>>;
  isRetweetPending: boolean;
  handleRetweet: () => void;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedItemForQuote: FeedItemWithRelations | null;
  setSelectedItemForQuote: Dispatch<
    SetStateAction<FeedItemWithRelations | null>
  >;
  handleOpenQuoteModal: () => void;
  isDeleting: boolean;
  handleDelete: () => void;
  mutate: ReturnType<typeof useSWRConfig>["mutate"];
}

// カスタムフック本体
export function useCardInteraction(
  itemProp: FeedItemWithRelations | null | undefined,
  loggedInUserDbId: string | null
): UseCardInteractionReturn {
  // ★ 戻り値は常にオブジェクトを返すように ★

  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const [isRetweetDialogOpen, setIsRetweetDialogOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedItemForQuote, setSelectedItemForQuote] =
    useState<FeedItemWithRelations | null>(null);
  const [isRetweetPending, startRetweetTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition(); 

  // --- 計算済みデータ (useMemo) ---
  // itemProp が null/undefined の場合に備え、デフォルト値や null を返すように修正
  const user = useMemo(() => itemProp?.user ?? null, [itemProp]);
  const post = useMemo(() => itemProp?.post ?? null, [itemProp]);
  const rankingList = useMemo(() => itemProp?.rankingList ?? null, [itemProp]);
  const createdAt = useMemo(() => itemProp?.createdAt ?? null, [itemProp]);
  const feedItemId = useMemo(() => itemProp?.id ?? null, [itemProp]);
  const type = useMemo(() => itemProp?.type ?? null, [itemProp]);
  const retweetOfFeedItem = useMemo(
    () => itemProp?.retweetOfFeedItem ?? null,
    [itemProp]
  );
  const quotedFeedItem = useMemo(
    () => itemProp?.quotedFeedItem ?? null,
    [itemProp]
  );
  const feedCounts = useMemo(() => itemProp?._count ?? null, [itemProp]);
  const quoteRetweetCount = useMemo(
    () => itemProp?.quoteRetweetCount ?? 0,
    [itemProp]
  );

  const originalItem = useMemo(
    () => retweetOfFeedItem ?? quotedFeedItem,
    [retweetOfFeedItem, quotedFeedItem]
  );

  const likeTargetType = useMemo(() => {
    if (!type) return null; // タイプがなければ null
    if (type === FeedType.POST || type === FeedType.QUOTE_RETWEET)
      return "Post";
    if (type === FeedType.RANKING_UPDATE) return "RankingList";
    if (type === FeedType.RETWEET) {
      if (originalItem?.type === FeedType.POST) return "Post";
      if (originalItem?.type === FeedType.RANKING_UPDATE) return "RankingList";
    }
    return null;
  }, [type, originalItem]);

  const likeTargetId =
    useMemo(() => {
      if (!likeTargetType) return null;
      if (likeTargetType === "Post")
        return (
          post?.id ?? (type === FeedType.RETWEET ? originalItem?.post?.id : null)
        );
      if (likeTargetType === "RankingList")
        return (
          rankingList?.id ??
          (type === FeedType.RETWEET ? originalItem?.rankingList?.id : null)
        );
      return null;
    }, [likeTargetType, post, rankingList, originalItem, type]) ?? null;

  const likes = useMemo(() => {
    if (!likeTargetType) return [];
    if (likeTargetType === "Post")
      return (
        post?.likes ??
        (type === FeedType.RETWEET ? originalItem?.post?.likes : []) ??
        []
      );
    if (likeTargetType === "RankingList")
      return (
        rankingList?.likes ??
        (type === FeedType.RETWEET ? originalItem?.rankingList?.likes : []) ??
        []
      );
    return [];
  }, [likeTargetType, post, rankingList, originalItem, type]);

  const likeCount = useMemo(() => {
    if (!likeTargetType) return 0;
    if (likeTargetType === "Post")
      return (
        post?.likeCount ??
        (type === FeedType.RETWEET ? originalItem?.post?.likeCount : 0) ??
        0
      );
    if (likeTargetType === "RankingList")
      return (
        rankingList?.likeCount ??
        (type === FeedType.RETWEET
          ? originalItem?.rankingList?.likeCount
          : 0) ??
        0
      );
    return 0;
  }, [likeTargetType, post, rankingList, originalItem, type]);

  const initialLiked = useMemo(() => {
    const currentLikes = (likes as { userId: string }[] | undefined) ?? [];
    return loggedInUserDbId
      ? currentLikes.some((like) => like.userId === loggedInUserDbId)
      : false;
  }, [likes, loggedInUserDbId]);

  const commentCount = useMemo(() => post?._count?.replies ?? 0, [post]);
  const retweetCount = useMemo(() => feedCounts?.retweets ?? 0, [feedCounts]);
  const isOwner = useMemo(
    () =>
      !!(loggedInUserDbId && itemProp && loggedInUserDbId === itemProp.user.id),
    [loggedInUserDbId, itemProp]
  );

  // --- コールバック関数 (useCallback) ---
  const handleRetweet = useCallback(() => {
    if (!feedItemId || isRetweetPending) return;
    startRetweetTransition(async () => {
      try {
        const result = await retweetAction(feedItemId);
        if (result.success) {
          toast({ title: "リポストしました" });
          setIsRetweetDialogOpen(false);
          // ★★★ mutate の呼び出し方をキーフィルター指定に戻す ★★★
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed", // キーフィルター関数
            undefined, // 再検証をトリガー
            { revalidate: true } // 再検証を強制
          );
        } else {
          throw new Error(result.error || "リポスト失敗");
        }
      } catch (error) {
        toast({
          title: "エラー",
          description:
            error instanceof Error ? error.message : "リポストできませんでした",
          variant: "destructive",
        });
        setIsRetweetDialogOpen(false);
      }
    });
    // ★ 依存配列 (mutate は参照が変わらないので削除しても良いと ESLint が言う可能性あり) ★
  }, [
    feedItemId,
    isRetweetPending,
    startRetweetTransition,
    mutate,
    toast,
  ]);

  const handleOpenQuoteModal = useCallback(() => {
    if (!itemProp) return;
    setSelectedItemForQuote(itemProp);
    setIsQuoteModalOpen(true);
    console.log("Opening quote modal for FeedItem:", itemProp.id);
  }, [itemProp, setSelectedItemForQuote, setIsQuoteModalOpen]);

  const handleDelete = useCallback(() => {
    if (!isOwner || !feedItemId || isDeleting || !type) return;
    const currentPostId = post?.id;
    const currentOriginalItemId = originalItem?.id;

    startDeleteTransition(async () => {
      try {
        let result: ActionResult;
        if (type === FeedType.POST) {
          if (!currentPostId) throw new Error("削除対象の投稿ID不明");
          result = await deletePostAction(currentPostId);
        } else if (type === FeedType.QUOTE_RETWEET) {
          result = await deleteQuoteRetweetAction(feedItemId);
        } else if (type === FeedType.RETWEET) {
          if (!currentOriginalItemId) throw new Error("リツイート元不明");
          result = await undoRetweetAction(currentOriginalItemId);
        } else if (type === FeedType.RANKING_UPDATE) {
          console.warn("...");
          result = { success: false, error: "未実装" };
        } else {
          throw new Error("削除不可タイプ");
        }
        if (result.success) {
          toast({ title: "削除しました。" });
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed", // キーフィルター関数
            undefined, // 再検証をトリガー
            { revalidate: true } // 再検証を強制
          );
        } else {
          throw new Error(result.error || "削除失敗");
        }
      } catch (error) {
        toast({ title: "削除エラー" /*...*/ });
      }
    });
  }, [
    isOwner,
    feedItemId,
    type,
    originalItem,
    post,
    isDeleting,
    startDeleteTransition,
    mutate,
    toast,
  ]);

  // --- フックが返す値 ---
  // ★ itemProp が null/undefined の場合、デフォルト値や null を返す ★
  //    (型定義 UseCardInteractionReturn も Optional を許容するように修正が必要な場合あり)
  return {
    user: itemProp?.user ?? null,
    post: itemProp?.post ?? null,
    rankingList: itemProp?.rankingList ?? null,
    originalItem:
      itemProp?.retweetOfFeedItem ?? itemProp?.quotedFeedItem ?? null,
    createdAt: itemProp?.createdAt ?? null,
    feedItemId: itemProp?.id ?? null,
    type: itemProp?.type ?? null,
    isOwner,
    likeTargetType,
    likeTargetId,
    initialLiked,
    likeCount,
    commentCount,
    retweetCount,
    quoteRetweetCount: itemProp?.quoteRetweetCount ?? 0, // itemProp を使う
    isRetweetDialogOpen,
    setIsRetweetDialogOpen,
    isRetweetPending,
    handleRetweet,
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    selectedItemForQuote,
    setSelectedItemForQuote,
    handleOpenQuoteModal,
    isDeleting,
    handleDelete,
    mutate,
  };
}
