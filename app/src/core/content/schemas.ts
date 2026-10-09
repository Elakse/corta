/**
 * Zod schemas for every content file. Content is data written by the build-course skill;
 * these schemas are the boundary: anything invalid is reported, never rendered half-broken.
 * Body items (blocks and child nodes) are validated by `validate.ts` using the block registry.
 */
import { z } from "zod";

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
export const SLUG_RE = /^[a-z0-9_]+(?:-[a-z0-9]+)*$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const NodeId = z.string().regex(ID_RE, "IDs are kebab-case path segments, e.g. alg/p1/autoval/def");
export const Slug = z.string().regex(SLUG_RE, "use kebab-case, e.g. parcial-1");
export const DateStr = z.string().regex(DATE_RE, "dates are YYYY-MM-DD");
export const TimeStr = z.string().regex(TIME_RE, "times are HH:MM (24h)");

export const Basis = z.enum(["explicit", "inferred", "generated"]);
export type Basis = z.infer<typeof Basis>;

export const SourceRef = z
  .object({
    /** source id from sources.yaml; may be omitted only when basis is "generated" */
    ref: z.string().min(1).optional(),
    page: z.union([z.number(), z.string()]).optional(),
    locator: z.string().optional(),
    basis: Basis,
  })
  .strict()
  .refine((s) => s.ref !== undefined || s.basis === "generated", { message: "ref is required unless basis is generated", path: ["ref"] });
export type SourceRef = z.infer<typeof SourceRef>;

export const RelationType = z.enum(["prerequisite", "related", "uses", "generalizes", "example-of", "tested-in"]);
export const Relation = z.object({ type: RelationType, target: NodeId }).strict();
export type Relation = z.infer<typeof Relation>;

export const VarValue = z.union([z.number(), z.boolean(), z.string()]);
export type VarValue = z.infer<typeof VarValue>;

/** Fields shared by every node. Kinds may add their own (see kind `fields`). Body is checked separately. */
export const NodeFields = z.object({
  id: NodeId,
  kind: z.string().min(1),
  title: z.string().optional(),
  container: z.boolean().optional(),
  weight: z.number().positive().optional(),
  number: z.string().optional(),
  note: z.string().optional(),
  vars: z.record(z.string().regex(/^[A-Za-z_]\w*$/, "variable names are identifiers"), VarValue).optional(),
  sources: z.array(SourceRef).optional(),
  relations: z.array(Relation).optional(),
  body: z.array(z.unknown()).default([]),
});
export type NodeFields = z.infer<typeof NodeFields>;

export const TopicFile = NodeFields.extend({ schema: z.literal(1) });

export const PaperType = z.enum(["ruled", "grid"]);
export type PaperType = z.infer<typeof PaperType>;

export const EvaluationFile = z
  .object({
    schema: z.literal(1),
    id: Slug,
    title: z.string(),
    paper: PaperType.default("ruled"),
    topics: z.array(z.string().regex(/^[\w.-]+\.ya?ml$/, "topic entries are file names in topics/, e.g. autovalores.yaml")).min(1),
  })
  .strict();
export type EvaluationFile = z.infer<typeof EvaluationFile>;

export const SourceKind = z.enum(["syllabus", "bibliography", "class", "guide", "midterm", "final", "assignment", "solution", "schedule", "other"]);
export const SourcesFile = z
  .object({
    schema: z.literal(1),
    sources: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "source ids are kebab-case"),
          path: z.string(),
          kind: SourceKind,
          title: z.string(),
          short: z.string().optional(),
          note: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type SourcesFile = z.infer<typeof SourcesFile>;
export type SourceEntry = SourcesFile["sources"][number];

export const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Weekday = z.infer<typeof Weekday>;
export const Modality = z.enum(["in-person", "virtual", "hybrid"]);

export const ClassSlot = z
  .object({
    id: Slug,
    label: z.string(),
    weekday: Weekday,
    start: TimeStr,
    end: TimeStr,
    from: DateStr,
    until: DateStr,
    location: z.string().optional(),
    modality: Modality.optional(),
    link: z.string().optional(),
    staff: z.array(z.string()).optional(),
    exceptions: z.array(DateStr).optional(),
  })
  .strict();
export type ClassSlot = z.infer<typeof ClassSlot>;

export const EvaluationKind = z.enum(["midterm", "retake", "final", "assignment", "submission"]);
export type EvaluationKind = z.infer<typeof EvaluationKind>;

export const EvaluationMeta = z
  .object({
    id: Slug,
    kind: EvaluationKind,
    title: z.string(),
    date: DateStr.optional(),
    start: TimeStr.optional(),
    end: TimeStr.optional(),
    location: z.string().optional(),
    scope: z.string().optional(),
    passing: z.string().optional(),
    /** an evaluation this one retakes (e.g. a recuperatorio of parcial-1) */
    retakes: Slug.optional(),
  })
  .strict();
export type EvaluationMeta = z.infer<typeof EvaluationMeta>;

export const CourseFile = z
  .object({
    schema: z.literal(1),
    id: Slug,
    name: z.string(),
    code: z.string().optional(),
    language: z.string().default("es"),
    /** prefix every node id in this course starts with (defaults to the course id) */
    idPrefix: z.string().optional(),
    staff: z.array(z.object({ name: z.string(), role: z.string().optional(), contact: z.string().optional() }).strict()).default([]),
    locations: z.array(z.object({ id: Slug, campus: z.string().optional(), room: z.string().optional(), address: z.string().optional() }).strict()).default([]),
    modality: Modality.optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() }).strict()).default([]),
    schedule: z.array(ClassSlot).default([]),
    bibliography: z.array(z.string()).default([]),
    evaluations: z.array(EvaluationMeta).default([]),
    promotion: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();
export type CourseFile = z.infer<typeof CourseFile>;

export const SemesterFile = z
  .object({
    schema: z.literal(1),
    id: z.string().regex(/^[_a-z0-9]+(?:-[a-z0-9]+)*$/i),
    label: z.string(),
    start: DateStr,
    end: DateStr,
    active: z.boolean().default(false),
    sample: z.boolean().optional(),
    courses: z.array(Slug).default([]),
    holidays: z.array(z.object({ date: DateStr, until: DateStr.optional(), label: z.string() }).strict()).default([]),
  })
  .strict();
export type SemesterFile = z.infer<typeof SemesterFile>;
