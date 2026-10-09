/**
 * Composition root: fills every registry (by auto-discovery) and loads content.
 * Import this once, before rendering. Scripts and tests import it too.
 */
import "@/kinds";
import "@/blocks";
import "@/calendar";
import "@/priority";
import "@/llm/actions";
import { useContent } from "@/core/content/store";
import { yamlFiles } from "@/core/content/source";

useContent.getState().reload(yamlFiles);
