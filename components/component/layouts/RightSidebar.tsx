// components/RightSidebar.tsx
import Link from "next/link";

export default function RightSidebar() {
  const trendingTopics = [
    { tag: "#technology", count: "12.3K" },
    { tag: "#travel", count: "8.7K" },
    { tag: "#fashion", count: "6.2K" },
    { tag: "#food", count: "9.5K" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4">Trending Topics</h3>
        <div className="space-y-2">
          {trendingTopics.map((topic) => (
            <Link
              key={topic.tag}
              href="#"
              className="flex items-center justify-between text-muted-foreground hover:text-primary"
              prefetch={false}
            >
              <span>{topic.tag}</span>
              <span className="bg-muted px-2 py-1 rounded-full text-xs">
                {topic.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
