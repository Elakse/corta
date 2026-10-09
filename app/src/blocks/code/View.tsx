import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { BlockComponentProps } from "@/core/registry";
import { useT } from "@/i18n";
import { Surface } from "@/ui/Surface";
import type { CodeProps } from "./index";
import { highlight } from "./highlight";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Plain-text version of the shiki markup: one `.line` span per line, joined by newlines. */
const plain = (code: string) => code.split("\n").map((l) => `<span class="line">${escape(l)}</span>`).join("\n");

export function CodeView({ props }: BlockComponentProps<CodeProps>) {
  const t = useT();
  const code = props.code.replace(/\n$/, "");
  const [html, setHtml] = useState(() => plain(code));
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setHtml(plain(code));
    let alive = true;
    highlight(code, props.lang).then((h) => alive && h && setHtml(h));
    return () => {
      alive = false;
    };
  }, [code, props.lang]);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);
  const copy = () => navigator.clipboard?.writeText(code).then(() => setCopied(true), () => {});
  return (
    <Surface
      className="surface-code code-block"
      head={
        <>
          <span className="surface-label">{props.lang}</span>
          <button type="button" className="surface-btn" data-done={copied} onClick={copy} aria-label={copied ? t("code.copied") : t("code.copy")} title={copied ? t("code.copied") : t("code.copy")}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </>
      }
    >
      <pre className="code-pre surface-scroll" data-lang={props.lang} tabIndex={0}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </Surface>
  );
}
