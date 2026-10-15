/**
 * Paints a range as marker strokes into an SVG laid over the text (pointer-events: none).
 * The texture is SVG noise in page coordinates, so it stays still while a stroke grows.
 */
import { rangeBoxes } from "./geometry";
import { bandPath, edgePath, strokesOf } from "./strokes";

const NS = "http://www.w3.org/2000/svg";
let ids = 0;

export type InkMotion = "follow" | "swipe" | "redraw";

export function createInk(svg: SVGSVGElement, root: Element) {
  const id = `hl-ink-${++ids}`;
  svg.innerHTML =
    `<defs><filter id="${id}" x="-2%" y="-40%" width="104%" height="180%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.045 0.7" numOctaves="2" seed="4" result="edge"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="edge" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="ragged"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.003 0.5" numOctaves="1" seed="9" result="streak"/>` +
    `<feColorMatrix in="streak" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.8 1.28" result="streakA"/>` +
    `<feComposite in="ragged" in2="streakA" operator="in"/></filter></defs>`;
  const layer = document.createElementNS(NS, "g");
  layer.setAttribute("filter", `url(#${id})`);
  svg.append(layer);
  let last = "";
  let fadeTimer = 0;

  return {
    draw(range: Range | null, motion: InkMotion = "follow") {
      clearTimeout(fadeTimer);
      svg.classList.remove("hl-fading");
      if (!range) { layer.replaceChildren(); last = ""; return; }
      const o = svg.getBoundingClientRect();
      const strokes = strokesOf(rangeBoxes(root, range), parseFloat(getComputedStyle(root).fontSize) || 16);
      const key = strokes.map((s) => `${s.x0 | 0},${s.x1 | 0},${s.cy | 0}`).join("|");
      if (key === last && motion !== "redraw") return;
      last = key;
      const g = document.createElementNS(NS, "g");
      if (motion === "swipe") g.classList.add("hl-swipe");
      const band = document.createElementNS(NS, "path");
      band.setAttribute("class", "hl-band");
      band.setAttribute("d", strokes.map((s) => bandPath(s, o.left, o.top)).join(""));
      const edge = document.createElementNS(NS, "path");
      edge.setAttribute("class", "hl-edge");
      edge.setAttribute("d", strokes.map((s) => edgePath(s, o.left, o.top)).join(""));
      g.append(band, edge);
      layer.replaceChildren(g);
    },
    fade() {
      svg.classList.add("hl-fading");
      clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => { layer.replaceChildren(); last = ""; svg.classList.remove("hl-fading"); }, 200);
    },
    destroy() { clearTimeout(fadeTimer); svg.replaceChildren(); },
  };
}
