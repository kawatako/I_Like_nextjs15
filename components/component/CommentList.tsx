// components/CommentList.tsx
import Comment from "./Comment";

export default function CommentList({ comments }: any) {
  return (
    <div className="mt-4 border-t pt-4 space-y-2">
      {comments.map((comment: string, index: number) => (
        <Comment key={index} comment={comment} />
      ))}
    </div>
  );
}
