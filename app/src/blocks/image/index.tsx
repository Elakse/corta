import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { ImageView } from "./View";

const schema = z
  .object({
    src: z.string().min(1),
    alt: z.string().default(""),
    caption: z.string().optional(),
    /** max height in ruled lines (default: natural size) */
    lines: z.number().int().positive().max(40).optional(),
  })
  .strict();
export type ImageProps = z.infer<typeof schema>;

export default defineBlock<ImageProps>({
  type: "image",
  version: 1,
  group: "content",
  schema,
  component: ImageView,
  ruler: "snap",
  card: true,
  markup: (p) => (p.caption ? [p.caption] : []),
  describe: (p) => `[image] ${p.alt || p.caption || p.src}`,
  docs: `An image taped onto the page as a card. \`src\` is relative to the evaluation folder (e.g. \`assets/diagrama.png\`)
or an http(s) URL. Always write a meaningful \`alt\`. Optional \`caption\` (inline Markdown) and \`lines\` (max height in ruled lines).`,
  example: `- image: { src: assets/ciclo.png, alt: "Ciclo de vida de un objeto", caption: "Fuente: Teórica 3" }`,
});
