import type { BlockComponentProps } from "@/core/registry";
import { resolveAsset } from "@/core/content/assets";
import { renderInline } from "@/core/markup";
import type { ImageProps } from "./index";

export function ImageView({ props, ctx }: BlockComponentProps<ImageProps>) {
  const url = resolveAsset(ctx.evaluationDir, props.src);
  return (
    <figure className="blk-figure">
      {url ? (
        <img src={url} alt={props.alt} loading="lazy" style={props.lines ? { maxHeight: `calc(var(--u) * ${props.lines})` } : undefined} />
      ) : (
        <div className="block-error">Image not found: {props.src}</div>
      )}
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
