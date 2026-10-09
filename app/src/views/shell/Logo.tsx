/**
 * The Corta mark: a heavy italic "c" on a tile, cut by one clean diagonal. "Corta" is also the Argentine
 * closer ("¡corta!": that's that), so the cut is the point: the right half sits a step lower and settles
 * into place on hover (`.logo-half-r` in app.css). Colors come from the theme tokens, so it flips with the theme.
 */

/** Outline of the "c" in Bricolage Grotesque ExtraBold (the display font, SIL OFL), in font units, y up = negative. */
const C_GLYPH =
  "M311.0 14.0Q243.0 14.0 191.0 -5.0Q139.0 -24.0 104.0 -59.5Q69.0 -95.0 50.5 -145.0Q32.0 -195.0 32.0 -257.0Q32.0 -321.0 50.5 -373.0Q69.0 -425.0 104.0 -463.0Q139.0 -501.0 190.0 -521.5Q241.0 -542.0 307.0 -542.0Q373.0 -542.0 421.0 -521.0Q469.0 -500.0 499.5 -462.0Q530.0 -424.0 541.0 -374.0L392.0 -324.0Q389.0 -357.0 376.0 -378.0Q363.0 -399.0 342.5 -408.5Q322.0 -418.0 298.0 -418.0Q273.0 -418.0 254.0 -408.0Q235.0 -398.0 222.0 -378.0Q209.0 -358.0 202.0 -329.5Q195.0 -301.0 195.0 -264.0Q195.0 -211.0 208.5 -175.5Q222.0 -140.0 248.5 -122.0Q275.0 -104.0 313.0 -104.0Q352.0 -104.0 374.0 -120.0Q396.0 -136.0 406.0 -159.5Q416.0 -183.0 418.0 -206.0L558.0 -175.0Q554.0 -138.0 538.5 -103.5Q523.0 -69.0 493.0 -42.5Q463.0 -16.0 418.5 -1.0Q374.0 14.0 311.0 14.0Z";

// 32×32 box: the tile is inset so the lowered right half still fits inside the viewBox.
const TILE = { x: 1.2, y: 0.6, size: 29.6, radius: 8 };
const GLYPH_SCALE = 0.0353;
const GLYPH_X = 4.81;
const GLYPH_Y = 24.93;

/** One clip per half of the tile; the cut runs from (19, -5) to (13, 37), through the middle of the "c". */
const CUT_LEFT = "-5,-5 19,-5 13,37 -5,37";
const CUT_RIGHT = "19,-5 37,-5 37,37 13,37";

function Tile({ fill }: { fill: string }) {
  return (
    <>
      <rect x={TILE.x} y={TILE.y} width={TILE.size} height={TILE.size} rx={TILE.radius} fill={fill} />
      <g transform={`translate(${GLYPH_X} ${GLYPH_Y}) scale(${GLYPH_SCALE})`}>
        <path transform="skewX(-10)" fill="var(--paper)" d={C_GLYPH} />
      </g>
    </>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <defs>
        <clipPath id="logo-cut-l">
          <polygon points={CUT_LEFT} />
        </clipPath>
        <clipPath id="logo-cut-r">
          <polygon points={CUT_RIGHT} />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-cut-l)">
        <Tile fill="var(--ink)" />
      </g>
      <g className="logo-half-r">
        <g clipPath="url(#logo-cut-r)">
          <Tile fill="var(--pen)" />
        </g>
      </g>
    </svg>
  );
}
