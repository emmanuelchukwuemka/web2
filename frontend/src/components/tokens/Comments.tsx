"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { shortAddress, timeAgo } from "@/lib/utils";
import { fetchComments, postComment, type Comment } from "@/lib/api";

interface CommentsProps {
  tokenAddress: string;
}

function CommentBubble({
  comment,
  tokenAddress,
  onReply,
}: {
  comment: Comment;
  tokenAddress: string;
  onReply: (parentId: number, parentAuthor: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple-light">
          {comment.author.slice(2, 4).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-accent-purple-light">
              {shortAddress(comment.author)}
            </span>
            <span className="text-xs text-text-muted">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Reply button */}
          <button
            onClick={() => onReply(comment.id, comment.author)}
            className="mt-1.5 text-xs text-text-muted hover:text-accent-purple-light transition-colors"
          >
            Reply
          </button>

          {/* Replies toggle */}
          {(comment.replies?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="mt-1 flex items-center gap-1 text-xs text-accent-purple-light hover:underline"
            >
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Replies */}
          {showReplies && comment.replies?.map((reply) => (
            <div key={reply.id} className="mt-2 ml-4 pl-3 border-l border-border">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-text-muted">{shortAddress(reply.author)}</span>
                <span className="text-xs text-text-muted">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{reply.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Comments({ tokenAddress }: CommentsProps) {
  const { address } = useAccount();
  const qc = useQueryClient();

  const [content,      setContent]      = useState("");
  const [replyTo,      setReplyTo]      = useState<{ id: number; author: string } | null>(null);
  const [page,         setPage]         = useState(1);
  const LIMIT = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["comments", tokenAddress, page],
    queryFn:  () => fetchComments(tokenAddress, { page, limit: LIMIT }),
    refetchInterval: 15_000,
  });

  const mutation = useMutation({
    mutationFn: (body: { author: string; content: string; parentId?: number }) =>
      postComment(tokenAddress, body),
    onSuccess: () => {
      setContent("");
      setReplyTo(null);
      void qc.invalidateQueries({ queryKey: ["comments", tokenAddress] });
    },
  });

  function handleSubmit() {
    if (!address || !content.trim()) return;
    mutation.mutate({
      author:   address,
      content:  content.trim(),
      parentId: replyTo?.id,
    });
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Replying to {shortAddress(replyTo.author)}</span>
            <button onClick={() => setReplyTo(null)} className="text-accent-red hover:underline">Cancel</button>
          </div>
        )}
        <textarea
          rows={2}
          placeholder={address ? (replyTo ? "Write a reply…" : "Leave a comment…") : "Connect wallet to comment"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          disabled={!address}
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 resize-none transition-colors disabled:opacity-50"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{content.length}/500</span>
          <Button
            size="sm"
            disabled={!address || !content.trim()}
            loading={mutation.isPending}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            <Send size={13} />
            {replyTo ? "Reply" : "Post"}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-xs text-accent-red">{(mutation.error as Error).message}</p>
        )}
      </div>

      {/* Comment list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !data || data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-text-muted">
          <MessageSquare size={32} className="opacity-30" />
          <p className="text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {data.data.map((c) => (
              <CommentBubble
                key={c.id}
                comment={c}
                tokenAddress={tokenAddress}
                onReply={(id, author) => setReplyTo({ id, author })}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{data.total} comments</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-xs text-text-muted self-center">{page} / {totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}