import { parseProject, type LabProject } from "../../../packages/core/project";
const files = import.meta.glob("../../../examples/**/*.effectlab", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
export const examples: LabProject[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, text]) => parseProject(text));
