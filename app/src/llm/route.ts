/** Where the user is, read from the URL (/s/<semester>/c/<course>/e/<evaluation>). */
export interface ScreenRoute {
  semester?: string;
  course?: string;
  evaluation?: string;
}

export function routeOf(path: string): ScreenRoute {
  const m = /^\/s\/([^/]+)(?:\/c\/([^/]+))?(?:\/e\/([^/]+))?/.exec(path);
  return { semester: m?.[1], course: m?.[2], evaluation: m?.[3] };
}

/** "<semester>/<course>" of the screen, if it belongs to a course. */
export function courseKeyOf(path: string): string | null {
  const r = routeOf(path);
  return r.semester && r.course ? `${r.semester}/${r.course}` : null;
}

export function evaluationKeyOf(path: string): string | null {
  const r = routeOf(path);
  return r.semester && r.course && r.evaluation ? `${r.semester}/${r.course}/${r.evaluation}` : null;
}
