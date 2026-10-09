/**
 * Generic plugin registry. Every extensible catalog in Corta (blocks, node kinds, calendar event types,
 * priority strategies, LLM actions) is one of these. Extending = adding a module that registers itself;
 * nothing else in the codebase switches on the key.
 */
export interface Registry<T> {
  readonly name: string;
  register(def: T): T;
  get(key: string): T | undefined;
  require(key: string): T;
  has(key: string): boolean;
  list(): T[];
  keys(): string[];
  /** Closest registered keys to `key` (for "did you mean" hints). */
  suggest(key: string, max?: number): string[];
}

export function createRegistry<T>(name: string, keyOf: (def: T) => string): Registry<T> {
  const map = new Map<string, T>();
  return {
    name,
    register(def) {
      const key = keyOf(def);
      if (!key) throw new Error(`[${name}] cannot register an entry without a key`);
      if (map.has(key) && map.get(key) !== def) throw new Error(`[${name}] duplicate key "${key}"`);
      map.set(key, def);
      return def;
    },
    get: (key) => map.get(key),
    require(key) {
      const def = map.get(key);
      if (!def) throw new Error(`[${name}] unknown key "${key}". Registered: ${[...map.keys()].join(", ")}`);
      return def;
    },
    has: (key) => map.has(key),
    list: () => [...map.values()],
    keys: () => [...map.keys()],
    suggest(key, max = 3) {
      return [...map.keys()]
        .map((k) => [k, distance(key, k)] as const)
        .filter(([, d]) => d <= Math.max(2, Math.floor(key.length / 3)))
        .sort((a, b) => a[1] - b[1])
        .slice(0, max)
        .map(([k]) => k);
    },
  };
}

/** Levenshtein distance (small strings only). */
export function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/**
 * Registers every module found by an `import.meta.glob(..., { eager: true })` call.
 * A module may `export default` one definition or an array of them.
 */
export function registerModules<T>(registry: Registry<T>, modules: Record<string, unknown>): void {
  for (const [path, mod] of Object.entries(modules)) {
    const def = (mod as { default?: T | T[] }).default;
    if (!def) throw new Error(`[${registry.name}] ${path} has no default export`);
    for (const d of Array.isArray(def) ? def : [def]) registry.register(d);
  }
}
