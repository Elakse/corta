import { memo, useEffect, useRef, type MouseEvent } from "react";
import { kindLabel, kindRegistry } from "@/core/registry";
import { BlockView, NodeScope } from "@/core/render";
import type { ContentNode, Course } from "@/core/content";
import { useNodeProgress } from "@/state/node-progress";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import { usePage } from "./page-context";
import { MathText } from "@/ui/MathText";

function SourceTag({ node, course }: { node: ContentNode; course: Course }) {
  const t = useT();
  const s = node.sources[0];
  if (!s) return null;
  if (s.basis === "generated") return <span className="src">{t("source.generated")}</span>;
  const entry = s.ref ? course.sources.get(s.ref) : undefined;
  const where = s.page !== undefined ? `p. ${s.page}` : s.locator;
  const label = [entry?.short ?? entry?.title ?? s.ref, where].filter(Boolean).join(" · ");
  const more = node.sources.length > 1 ? ` +${node.sources.length - 1}` : "";
  return (
    <span className="src" title={node.sources.map((x) => `${(x.ref && course.sources.get(x.ref)?.title) ?? x.ref ?? "—"} (${x.basis})`).join("\n")}>
      {label}
      {more}
      {s.basis === "inferred" ? ` · ${t("source.inferred")}` : ""}
    </span>
  );
}

function PencilNote({ text }: { text: string }) {
  return (
    <aside className="pencil-note" data-rl="text">
      <MathText text={text} />
    </aside>
  );
}

/** One node on the notebook page: its heading (by kind), pencil note, and body (blocks + child nodes). */
export const NodeView = memo(function NodeView({ node, number }: { node: ContentNode; number?: string }) {
  const page = usePage();
  const ref = useRef<HTMLElement>(null);
  const { status } = useNodeProgress(node.id);
  const selected = useUi((s) => s.selected === node.id);
  const kind = kindRegistry.get(node.kind);
  const heading = kind?.heading ?? "label";

  useEffect(() => page.registerNode(node.id, ref.current), [page, node.id]);

  const onClick = (e: MouseEvent) => {
    if ((e.target as Element).closest("button, a, input, select, textarea, canvas, svg, .card")) return;
    e.stopPropagation();
    useUi.getState().select(node.id);
  };

  const nodeHeading = (
    <>
      {heading === "section" && (
        <h2 className="sec-title" data-rl="text">
          {number && <span className="num">{number}</span>}
          {node.title && <MathText text={node.title} />}
        </h2>
      )}
      {heading === "label" && (
        <div className="kind" data-rl="text">
          <b>{kindLabel(node.kind, page.language)}</b>
          {node.title && <MathText text={node.title} className="title" />}
          <SourceTag node={node} course={page.course} />
        </div>
      )}
    </>
  );

  let sectionIndex = 0;
  return (
    <section
      ref={ref}
      className={`node k-${node.kind}${status === "done" ? " done" : ""}`}
      data-node={node.id}
      data-depth={node.depth}
      data-selected={selected || undefined}
      onClick={onClick}
    >
      {node.note ? (
        <div className="node-intro">
          <div className="node-heading">{nodeHeading}</div>
          <PencilNote text={node.note} />
        </div>
      ) : nodeHeading}
      <NodeScope.Provider value={{ nodeId: node.id, evaluationDir: page.evaluationDir, language: page.language }}>
        {node.body.map((e) => {
          if (e.type === "block") return <BlockView key={e.path} blockType={e.blockType} props={e.props} path={e.path} />;
          const child = e.node;
          const childIsSection = kindRegistry.get(child.kind)?.heading === "section";
          const childNumber = childIsSection ? child.number ?? (number ? `${number}.${++sectionIndex}` : String(++sectionIndex)) : undefined;
          return <NodeView key={child.id} node={child} number={childNumber} />;
        })}
      </NodeScope.Provider>
    </section>
  );
});
