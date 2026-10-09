import type {
  CourseFile, EvaluationFile, EvaluationMeta, PaperType, Relation, SemesterFile, SourceEntry, SourceRef, VarValue,
} from "./schemas";

export type Severity = "error" | "warning";

export interface ContentIssue {
  severity: Severity;
  file: string;
  /** dotted path inside the file, e.g. body[2].node.body[0].math */
  path: string;
  message: string;
  hint?: string;
}

export interface BlockEntry {
  type: "block";
  blockType: string;
  props: unknown;
  /** stable address of this block inside its node, e.g. "2" or "2.body.0" */
  path: string;
}
export interface NodeEntry {
  type: "node";
  node: ContentNode;
}
export type BodyEntry = BlockEntry | NodeEntry;

export interface ContentNode {
  id: string;
  kind: string;
  title?: string;
  container: boolean;
  weight?: number;
  number?: string;
  note?: string;
  vars: Record<string, VarValue>;
  sources: SourceRef[];
  relations: Relation[];
  /** kind-specific fields (e.g. exercise `origin`) */
  extra: Record<string, unknown>;
  body: BodyEntry[];
  children: ContentNode[];
  parentId?: string;
  depth: number;
  file: string;
}

export interface Evaluation {
  key: string; // semester/course/eval
  id: string;
  meta: EvaluationMeta;
  /** present when the evaluation has generated content (evaluations/<id>/evaluation.yaml) */
  content?: {
    title: string;
    paper: PaperType;
    topics: ContentNode[];
    file: string;
    /** directory of the evaluation, used to resolve canvas modules and images */
    dir: string;
  };
  issues: ContentIssue[];
}

export interface Course {
  key: string; // semester/course
  id: string;
  semesterId: string;
  data: CourseFile;
  sources: Map<string, SourceEntry>;
  evaluations: Evaluation[];
  dir: string;
  issues: ContentIssue[];
}

export interface Semester {
  id: string;
  data: SemesterFile;
  courses: Course[];
  file: string;
}

export interface GraphNodeRef {
  node: ContentNode;
  topicId: string;
  evaluationKey: string;
  courseKey: string;
}

export interface Edge {
  from: string;
  to: string;
  type: Relation["type"];
}

export interface ContentGraph {
  semesters: Semester[];
  courses: Map<string, Course>;
  evaluations: Map<string, Evaluation>;
  nodes: Map<string, GraphNodeRef>;
  edges: Edge[];
  issues: ContentIssue[];
}

export type { EvaluationFile, CourseFile, SemesterFile };
