import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { parseProject, type LabProject } from "../../packages/core/project";
import {
  validateValue,
  type ParameterValue,
} from "../../packages/parameter-schema";
export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  modifiedAt: string;
  project: LabProject;
  thumbnail?: string;
}
export interface Revision {
  id: string;
  projectId: string;
  name: string;
  note: string;
  createdAt: string;
  hash: string;
  project: LabProject;
}
export interface Preset {
  id: string;
  name: string;
  projectId: string;
  values: Record<string, ParameterValue>;
  createdAt: string;
}
export interface LibraryData {
  version: 1;
  items: LibraryItem[];
  presets: Preset[];
  revisions: Revision[];
}
const empty = (): LibraryData => ({
  version: 1,
  items: [],
  presets: [],
  revisions: [],
});
const createLibraryStore = () =>
  create<{ data: LibraryData; loaded: boolean; error: string }>(() => ({
    data: empty(),
    loaded: false,
    error: "",
  }));
const devCache = globalThis as typeof globalThis & {
  __effectLabLibrary?: ReturnType<typeof createLibraryStore>;
};
export const useLibrary = import.meta.env.DEV
  ? (devCache.__effectLabLibrary ??= createLibraryStore())
  : createLibraryStore();
let chain: Promise<unknown> = Promise.resolve();
let loading: Promise<void> | undefined;
export function loadLibrary(): Promise<void> {
  return (loading ??= (async () => {
    try {
      const text = isTauri()
        ? await invoke<string>("read_library")
        : (localStorage.getItem("effectlab-library") ?? "[]");
      const parsed = JSON.parse(text);
      const data = Array.isArray(parsed) ? empty() : parsed;
      if (
        data.version !== 1 ||
        !Array.isArray(data.items) ||
        !Array.isArray(data.revisions) ||
        !Array.isArray(data.presets)
      )
        throw Error("Biblioteca no compatible");
      for (const item of data.items) parseProject(JSON.stringify(item.project));
      useLibrary.setState({ data, loaded: true, error: "" });
    } catch (e) {
      useLibrary.setState({ loaded: true, error: String(e) });
      throw e;
    }
  })());
}
async function mutate(fn: (data: LibraryData) => void): Promise<void> {
  const operation = async () => {
    await loadLibrary();
    if (useLibrary.getState().error)
      throw Error(
        "No se sobrescribirá una biblioteca con errores. Recuperá el respaldo antes de continuar.",
      );
    const data = structuredClone(useLibrary.getState().data);
    fn(data);
    const text = JSON.stringify(data);
    if (text.length > 32 * 1024 * 1024)
      throw Error(
        "Biblioteca supera 32 MB. Exportá y archivá versiones antes de agregar más.",
      );
    if (isTauri()) await invoke("write_library", { content: text });
    else localStorage.setItem("effectlab-library", text);
    useLibrary.setState({ data });
  };
  const next = chain.then(operation);
  chain = next.catch(() => {});
  await next;
}
export async function saveToLibrary(
  project: LabProject,
  metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
  },
): Promise<string> {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await mutate((data) =>
    data.items.push({
      ...metadata,
      id,
      favorite: false,
      createdAt: now,
      modifiedAt: now,
      thumbnail: project.files.find(
        (f) => f.content.startsWith("data:image/") && f.content.length < 400000,
      )?.content,
      project: structuredClone(project),
    }),
  );
  return id;
}
export async function updateLibraryItem(
  id: string,
  patch: Partial<
    Pick<
      LibraryItem,
      "name" | "description" | "category" | "tags" | "favorite" | "thumbnail"
    >
  >,
) {
  await mutate((data) => {
    const item = data.items.find((i) => i.id === id);
    if (!item) throw Error("Elemento ausente");
    Object.assign(item, patch, { modifiedAt: new Date().toISOString() });
  });
}
export async function duplicateItem(id: string) {
  await mutate((data) => {
    const item = data.items.find((i) => i.id === id);
    if (!item) throw Error("Elemento ausente");
    data.items.push({
      ...structuredClone(item),
      id: crypto.randomUUID(),
      name: item.name + " · variante",
      project: { ...structuredClone(item.project), id: crypto.randomUUID() },
      favorite: false,
      createdAt: new Date().toISOString(),
    });
  });
}
export async function removeLibraryItem(id: string) {
  await mutate((data) => {
    data.items = data.items.filter((i) => i.id !== id);
  });
}
export async function checkpoint(
  project: LabProject,
  note: string,
): Promise<Revision> {
  const source = JSON.stringify({
    files: project.files,
    parameters: project.parameters,
    composition: project.composition,
  });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  const hash = [...new Uint8Array(bytes)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const revision: Revision = {
    id: crypto.randomUUID(),
    projectId: project.id,
    name: project.name,
    note,
    createdAt: new Date().toISOString(),
    hash,
    project: structuredClone(project),
  };
  await mutate((data) => {
    if (
      !data.revisions.some((r) => r.projectId === project.id && r.hash === hash)
    )
      data.revisions.push(revision);
  });
  return revision;
}
export async function savePreset(project: LabProject, name: string) {
  await mutate((data) =>
    data.presets.push({
      id: crypto.randomUUID(),
      name,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      values: Object.fromEntries(
        project.parameters.map((p) => [p.binding, p.value]),
      ),
    }),
  );
}
export function applyPreset(
  project: LabProject,
  preset: Preset,
): { project: LabProject; omitted: string[] } {
  if (project.id !== preset.projectId)
    throw Error("El preset pertenece a otro efecto");
  const result = structuredClone(project);
  const omitted: string[] = [];
  for (const [binding, value] of Object.entries(preset.values)) {
    const p = result.parameters.find((p) => p.binding === binding);
    if (!p) {
      omitted.push(binding);
      continue;
    }
    try {
      p.value = validateValue(p, value);
    } catch {
      omitted.push(binding);
    }
  }
  return { project: result, omitted };
}
export async function removePreset(id: string) {
  await mutate((data) => {
    data.presets = data.presets.filter((p) => p.id !== id);
  });
}
export async function renamePreset(id: string, name: string) {
  await mutate((data) => {
    const preset = data.presets.find((p) => p.id === id);
    if (preset) preset.name = name;
  });
}
