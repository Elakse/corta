/** Shiki, loaded on demand, with a theme made of CSS variables mapped to the notebook tokens. */
let ready: Promise<typeof import("shiki")> | null = null;
let theme: unknown = null;

export async function highlight(code: string, lang: string): Promise<string | null> {
  ready ??= import("shiki");
  const shiki = await ready;
  theme ??= shiki.createCssVariablesTheme({ name: "corta", variablePrefix: "--shiki-", fontStyle: true });
  try {
    const html = await shiki.codeToHtml(code, { lang, theme: theme as never });
    // keep only the inner lines: the <pre> belongs to the block (ruler holder)
    const m = /<code[^>]*>([\s\S]*)<\/code>/.exec(html);
    return m ? m[1]! : null;
  } catch {
    return null; // unknown language → plain text
  }
}
