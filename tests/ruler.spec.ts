/**
 * The ruler test (port of prototypes/notebook-page/baseline-check.py). Gates every change:
 * every visible line of text, every display formula and every table row must have its baseline
 * SINK px above a rule (±1px), with all collapsibles open, in light + dark, at 1300 / 900 / 400 px.
 */
import { expect, test } from "@playwright/test";
import { evaluationPages } from "./pages";
import { openNotebook, settle } from "./notebook";

const SINK = 2;
const WIDTHS = [1300, 900, 400];
const SCHEMES = ["light", "dark"] as const;

type Hit = [kind: string, text: string, offset: number];

const MEASURE = () => {
  const frame = document.querySelector(".frame") as HTMLElement;
  const flow = document.querySelector(".flow") as HTMLElement;
  const u = parseFloat(getComputedStyle(frame).getPropertyValue("--u"));
  const o = frame.getBoundingClientRect().top + frame.clientTop;
  const res: [string, string, number][] = [];
  const mod = (y: number) => +((((y - o) % u) + u) % u).toFixed(1);
  const probe = (parent: Node, before: Node | null) => {
    const p = document.createElement("span");
    p.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    parent.insertBefore(p, before);
    const y = p.getBoundingClientRect().bottom;
    p.remove();
    return y;
  };
  const hidden = (el: Element) => !!el.closest('.sol[data-open="false"] .sol-body');
  const SKIP = ".card, .pencil-note, .katex, .src, svg, .rl-snap, .margin-layer, .tbl th, script, style";
  // text lines
  const tw = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n: Node | null;
  while ((n = tw.nextNode())) {
    const t = n as Text;
    if (!t.textContent!.trim()) continue;
    const el = t.parentElement!;
    if (el.closest(SKIP) || hidden(el)) continue;
    if (!el.getClientRects().length) continue;
    texts.push(t);
  }
  for (const t of texts) {
    let lastTop: number | null = null;
    const starts: number[] = [];
    for (let i = 0; i < t.length; i++) {
      if (!t.data[i]!.trim()) continue;
      const r = document.createRange();
      r.setStart(t, i);
      r.setEnd(t, i + 1);
      const rc = r.getBoundingClientRect();
      if (lastTop === null || Math.abs(rc.top - lastTop) > 8) {
        starts.push(i);
        lastTop = rc.top;
      }
    }
    for (const i of starts.reverse()) {
      const r = document.createRange();
      r.setStart(t, i);
      r.collapse(true);
      const p = document.createElement("span");
      p.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      r.insertNode(p);
      const y = p.getBoundingClientRect().bottom;
      p.remove();
      res.push(["text", t.data.slice(i, i + 18).trim(), mod(y)]);
    }
    t.parentElement!.normalize();
  }
  // display formulas
  flow.querySelectorAll('[data-rl="math"]').forEach((m) => {
    if (hidden(m) || m.closest(".rl-snap")) return;
    const html = m.querySelector(".katex-html");
    if (!html) return;
    res.push(["math", (m.textContent ?? "").slice(0, 18), mod(probe(html, html.firstChild))]);
  });
  // table rows (shared baseline of the first cell)
  flow.querySelectorAll('[data-rl="table"] tr').forEach((tr) => {
    const cell = (tr as HTMLTableRowElement).cells[0];
    if (!cell || hidden(tr)) return;
    res.push(["row", (tr.textContent ?? "").slice(0, 18), mod(probe(cell, cell.firstChild))]);
  });
  return { u, res };
};

for (const pg of evaluationPages()) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      test(`ruler · ${pg.name} · ${width}px ${scheme}`, async ({ browser }) => {
        test.setTimeout(360_000); // a full course page at 400px is ~16k lines to measure
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
        const page = await ctx.newPage();
        await openNotebook(page, pg.url, { openAll: true });
        await page.evaluate((mode) => document.documentElement.setAttribute("data-theme", mode), scheme);
        await settle(page);
        const { u, res } = await page.evaluate(MEASURE);
        const want = u - SINK;
        const bad = (res as Hit[]).filter((x) => x[1] && Math.abs(x[2] - want) > 1.01 && Math.abs(x[2] - want + u) > 1.01);
        console.log(`${pg.name} ${width}px ${scheme}: ${res.length} lines, ${bad.length} off the rule`);
        expect(res.length, "found no lines to check").toBeGreaterThan(10);
        expect(bad, `lines off the rule:\n${bad.slice(0, 25).map((b) => JSON.stringify(b)).join("\n")}`).toEqual([]);
        await ctx.close();
      });
    }
  }
}

for (const scheme of SCHEMES) for (const width of [...WIDTHS, 1440, 1530]) {
  test(`ruler with tutor · ${width}px ${scheme}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await openNotebook(page, "/s/_sample/c/algebra/e/parcial-1", { openAll: true });
    await page.evaluate((mode) => document.documentElement.setAttribute("data-theme", mode), scheme);
    await page.getByRole("button", { name: "Preguntar", exact: true }).click();
    await expect(page.locator(".chat")).toBeVisible();
    await settle(page);
    const { u, res } = await page.evaluate(MEASURE);
    const bad = (res as Hit[]).filter((x) => x[1] && Math.abs(x[2] - (u - SINK)) > 1.01 && Math.abs(x[2] + SINK) > 1.01);
    expect(res.length).toBeGreaterThan(10);
    expect(bad, `lines off the rule with tutor: ${JSON.stringify(bad.slice(0, 25))}`).toEqual([]);
    await ctx.close();
  });
}
