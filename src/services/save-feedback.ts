import type { LabProject } from "../../packages/core/project";
import { useLab } from "../stores/lab";
import { saveProject } from "./persistence";
export interface SaveFeedback {
  phase: "saving" | "saved" | "cancelled" | "error";
  projectId: string;
  time?: string;
  error?: string;
}
export async function saveWithFeedback(
  saveAs: boolean,
  report: (state: SaveFeedback) => void,
  write: (
    project: LabProject,
    saveAs: boolean,
  ) => Promise<boolean> = saveProject,
) {
  const project = useLab.getState().project;
  report({ phase: "saving", projectId: project.id });
  try {
    const written = await write(project, saveAs);
    if (!written) {
      report({ phase: "cancelled", projectId: project.id });
      return;
    }
    if (useLab.getState().project === project) useLab.getState().saved();
    report({
      phase: "saved",
      projectId: project.id,
      time: new Date().toLocaleTimeString("es-AR"),
    });
    useLab.getState().log("info", "Proyecto guardado.");
  } catch (error) {
    const message = String(error).replace(/^Error: /, "");
    report({ phase: "error", projectId: project.id, error: message });
    useLab.getState().log("error", message);
  }
}
