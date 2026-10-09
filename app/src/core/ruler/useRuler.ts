import { useEffect, useState, type RefObject } from "react";
import { createRuler, type Ruler, type RulerOptions } from "./engine";

/** Creates and starts a ruler for a frame/flow pair; returns it once mounted. */
export function useRuler(frame: RefObject<HTMLElement | null>, flow: RefObject<HTMLElement | null>, opts?: RulerOptions): Ruler | null {
  const [ruler, setRuler] = useState<Ruler | null>(null);
  useEffect(() => {
    if (!frame.current || !flow.current) return;
    const r = createRuler(frame.current, flow.current, opts);
    const stop = r.start();
    setRuler(r);
    return () => {
      stop();
      setRuler(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, flow]);
  return ruler;
}
