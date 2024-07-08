// components/PostList.tsx
import Post from "./Post";

export default function PostList() {
  const posts = [
    {
      id: 1,
      author: { name: "Jane Doe", username: "@janedoe" },
      content:
        "Excited to share my latest project with you all! Check it out and let me know what you think.",
      timestamp: "2h",
      comments: [
        { author: "John Doe", content: "Great work!" },
        { author: "Jane Doe", content: "Looks amazing!" },
      ],
    },
    {
      id: 2,
      author: { name: "John Smith", username: "@johnsmith" },
      content:
        "Enjoying the beautiful weather today! Whos up for a hike later?",
      timestamp: "1h",
    },
  ];

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}
