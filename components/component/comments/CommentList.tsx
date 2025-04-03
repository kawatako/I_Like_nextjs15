// components/CommentList.tsx
import Comment from "./Comment";

export default function CommentList({ replies }: any) {
  return (
    <div className="mt-4 border-t pt-4 space-y-2">
      {replies.map((reply: string, index: number) => (
        <Comment key={index} reply={reply} />
      ))}
    </div>
  );
}
