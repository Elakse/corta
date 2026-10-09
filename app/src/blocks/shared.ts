import { z } from "zod";

/** A nested list of blocks (validated item by item by the content loader). */
export const BlockListSchema = z.array(z.unknown());

/** Sum of the plain-text length of strings, as a content size (≈ one unit per short paragraph). */
export const textSize = (...parts: (string | undefined)[]) => parts.reduce((s, p) => s + (p?.length ?? 0), 0) / 280;
