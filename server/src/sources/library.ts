/**
 * A course's source library on disk: `sources.yaml` (id → original file) and the extracted text in
 * `processed/text/`. Read-only; every path is checked to stay inside its course folder.
 */
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse } from "yaml";
import { splitPages } from "./text";

export interface SourceInfo {
  id: string;
  path: string;
  kind?: string;
  title?: string;
  short?: string;
}

const SEGMENT = /^[\w.-]+$/;

/** `path` resolved under `base`, or null if it escapes it. */
export function inside(base: string, path: string): string | null {
  const full = resolve(base, path);
  const rel = relative(base, full);
  return rel && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) ? full : null;
}

export class CourseLibrary {
  private constructor(readonly dir: string, readonly sources: Map<string, SourceInfo>) {}

  /** Finds `semesters/<semester>/courses/<course>` in the first content root that has it. */
  static async open(roots: string[], semester: string, course: string): Promise<CourseLibrary | null> {
    if (!SEGMENT.test(semester) || !SEGMENT.test(course)) return null;
    for (const root of roots) {
      const dir = join(root, "semesters", semester, "courses", course);
      const file = join(dir, "sources.yaml");
      if (!existsSync(file)) continue;
      const data = parse(await readFile(file, "utf8")) as { sources?: SourceInfo[] } | null;
      return new CourseLibrary(dir, new Map((data?.sources ?? []).filter((s) => s?.id && s.path).map((s) => [s.id, s])));
    }
    return null;
  }

  /** Absolute path of a source's original file (inside the course folder), or null. */
  file(ref: string): string | null {
    const s = this.sources.get(ref);
    if (!s) return null;
    const full = inside(this.dir, s.path);
    return full && existsSync(full) ? full : null;
  }

  /** Extracted text of a source, split into pages; null when it was never extracted. */
  async pages(ref: string): Promise<string[] | null> {
    const s = this.sources.get(ref);
    if (!s) return null;
    const file = await this.textFile(s.path);
    return file ? splitPages(await readFile(file, "utf8")) : null;
  }

  /** `processed/text/<path under sources/>.txt`, else a unique file with the same name anywhere in `processed/text/`. */
  private async textFile(sourcePath: string): Promise<string | null> {
    const textDir = join(this.dir, "processed", "text");
    if (!existsSync(textDir)) return null;
    const stem = sourcePath.replace(/\\/g, "/").replace(/^sources\//, "").slice(0, -extname(sourcePath).length || undefined);
    const direct = inside(textDir, `${stem}.txt`);
    if (direct && existsSync(direct)) return direct;
    const wanted = `${basename(stem)}.txt`;
    const matches = (await walk(textDir)).filter((f) => basename(f) === wanted);
    return matches.length === 1 ? matches[0]! : null;
  }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (name.endsWith(".txt")) out.push(p);
  }
  return out;
}
