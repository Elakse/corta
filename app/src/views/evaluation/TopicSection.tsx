import { useEffect, useRef } from "react";
import type { ContentNode } from "@/core/content";
import { NodeView } from "./NodeView";

/**
 * Lazy topic: renders a placeholder (whole lines tall) until it comes near the viewport, then mounts for good.
 * Keeps long evaluation pages fast; the ruler re-aligns when it mounts.
 */
export function TopicSection({ topic, number, mounted, onNear, estimateLines }: { topic: ContentNode; number: string; mounted: boolean; onNear: () => void; estimateLines: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mounted || !ref.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onNear(), { rootMargin: "1600px 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [mounted, onNear]);
  if (!mounted) return <div ref={ref} className="topic-placeholder" data-placeholder={topic.id} style={{ height: `calc(var(--u) * ${estimateLines})` }} />;
  return (
    <div className="topic" data-topic={topic.id}>
      <NodeView node={topic} number={number} />
    </div>
  );
}
