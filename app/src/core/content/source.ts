/**
 * Vite adapter: pulls every content file through import.meta.glob (YAML as raw text, canvas modules lazily,
 * images as URLs) and feeds the pure loader. Editing a YAML file hot-reloads the content store.
 */
import type { ComponentType } from "react";

const contentYaml = import.meta.glob<string>(["@content/semesters/**/*.{yaml,yml}", "!@content/semesters/**/sources/**", "!@content/semesters/**/processed/**"], { query: "?raw", import: "default", eager: true });

/** Canvas modules (content/**\/canvas/*.tsx), loaded on demand. */
const contentCanvas = import.meta.glob<{ default: ComponentType<any> }>("@content/semesters/**/canvas/*.tsx");

const contentAssets = import.meta.glob<string>(["@content/semesters/**/*.{png,jpg,jpeg,svg,webp,gif}", "!@content/semesters/**/sources/**", "!@content/semesters/**/processed/**"], { query: "?url", import: "default", eager: true });

// Test fixtures are opt-in and never appear in a normal empty installation.
const testYaml = import.meta.env.VITE_CORTA_TEST_CONTENT === "1" ? import.meta.glob<string>("/../tests/fixtures/content/semesters/**/*.{yaml,yml}", { query: "?raw", import: "default", eager: true }) : {};
const testCanvas = import.meta.env.VITE_CORTA_TEST_CONTENT === "1" ? import.meta.glob<{ default: ComponentType<any> }>("/../tests/fixtures/content/semesters/**/canvas/*.tsx") : {};
export const yamlFiles = { ...contentYaml, ...testYaml };
export const canvasModules = { ...contentCanvas, ...testCanvas };
export const assetUrls = contentAssets;

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (mod) void import("./store").then(({ useContent }) => useContent.getState().reload(mod.yamlFiles as Record<string, string>));
  });
}
