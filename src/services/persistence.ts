import { invoke, isTauri } from "@tauri-apps/api/core";
import { parseProject, type LabProject } from "../../packages/core/project";
export async function openProject(): Promise<LabProject | null> {
  if (!isTauri())
    throw new Error("Abrir archivos requiere la aplicación de escritorio.");
  const text = await invoke<string | null>("open_project");
  return text ? parseProject(text) : null;
}
export async function saveProject(
  project: LabProject,
  saveAs = false,
): Promise<boolean> {
  parseProject(JSON.stringify(project));
  if (!isTauri()) {
    localStorage.setItem("effectlab-recovery", JSON.stringify(project));
    return true;
  }
  return invoke("save_project", {
    content: JSON.stringify(project, null, 2),
    saveAs,
    name: project.name,
  });
}
