/** Marker inks (theme tokens `marker-<id>`); the reader picks one in Settings. */
export const markerColors = ["yellow", "green", "pink", "blue", "orange"] as const;
export type MarkerColor = (typeof markerColors)[number];
export const DEFAULT_MARKER: MarkerColor = "yellow";
export const markerVar = (c: MarkerColor) => `var(--marker-${markerColors.includes(c) ? c : DEFAULT_MARKER})`;
