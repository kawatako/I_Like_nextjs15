// app/feeds/[feedItemId]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserDbIdByClerkId } from "@/lib/data/userQueries";
import { getFeedItemDetails } from "@/lib/data/feedQueries";
import PostCard from "@/components/feeds/cards/PostCard";
import RankingUpdateCard from "@/components/feeds/cards/RankingUpdateCard";
import RetweetCard from "@/components/feeds/cards/RetweetCard";
import QuoteRetweetCard from "@/components/feeds/cards/QuoteRetweetCard";

interface FeedDetailPageProps {
  params: Promise<{ feedItemId: string }>;
}

export default async function FeedDetailPage({ params }: FeedDetailPageProps) {
  const { feedItemId } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) notFound();
  const loggedInUserDbId = await getUserDbIdByClerkId(clerkId);

  const feedItem = await getFeedItemDetails(feedItemId);
  if (!feedItem) notFound();

  const renderCard = () => {
    switch (feedItem.type) {
      case "POST":
        return <PostCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />;
      case "RANKING_UPDATE":
        return (
          <RankingUpdateCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />
        );
      case "RETWEET":
        return <RetweetCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />;
      case "QUOTE_RETWEET":
        return (
          <QuoteRetweetCard item={feedItem} loggedInUserDbId={loggedInUserDbId} />
        );
      default:
        return <p className="text-red-500">不明なフィードタイプです。</p>;
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {renderCard()}
      <div className="mt-6 border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">コメント</h2>
        <p className="text-muted-foreground">(コメント機能は未実装です)</p>
      </div>
    </div>
  );
}
