import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
config({ path: resolve(ROOT, ".env"), quiet: true });

const str = (k: string) => (process.env[k] ?? "").trim();

export const env = {
  port: Number(str("CORTA_PORT") || 8787),
  appPort: Number(str("CORTA_APP_PORT") || 5173),
  dbPath: resolve(ROOT, str("CORTA_DB") || "server/data/corta.db"),
  /** where course folders live; synthetic fixtures join only for tests, like in the app */
  contentRoots: [resolve(ROOT, "content"), ...(str("CORTA_E2E") || str("VITE_CORTA_TEST_CONTENT") === "1" ? [resolve(ROOT, "tests/fixtures/content")] : [])],
  anthropicKey: str("ANTHROPIC_API_KEY"),
  opencodeGoKey: str("OPENCODE_GO_API_KEY"),
  llmModel: str("CORTA_LLM_MODEL"),
  opencodeGoModel: str("CORTA_OPENCODE_GO_MODEL"),
  anthropicModel: str("CORTA_ANTHROPIC_MODEL"),
  googleClientId: str("GOOGLE_CLIENT_ID"),
  googleClientSecret: str("GOOGLE_CLIENT_SECRET"),
};

/** Legacy global override applies only to the default provider, never leaks across profiles. */
export function providerModel(id: string, override: string, fallback: string): string {
  return override || ((str("CORTA_LLM_PROVIDER") || "anthropic") === id ? env.llmModel : "") || fallback;
}
