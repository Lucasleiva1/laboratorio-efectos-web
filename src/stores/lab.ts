import { create } from "zustand";
import {
  createProject,
  safePath,
  type LabProject,
} from "../../packages/core/project";
import {
  validateValue,
  type ParameterValue,
} from "../../packages/parameter-schema";
export interface Log {
  id: string;
  time: string;
  level: "info" | "warn" | "error";
  message: string;
}
interface LabState {
  project: LabProject;
  active: string;
  dirty: boolean;
  revision: number;
  logs: Log[];
  past: LabProject[];
  future: LabProject[];
  load: (p: LabProject) => void;
  update: (fn: (p: LabProject) => void) => void;
  edit: (path: string, content: string) => void;
  select: (path: string) => void;
  parameter: (id: string, value: ParameterValue) => void;
  undo: () => void;
  redo: () => void;
  saved: () => void;
  log: (level: Log["level"], message: string) => void;
  clear: () => void;
}
const createLabStore = () =>
  create<LabState>((set, get) => ({
    project: createProject(),
    active: "index.html",
    dirty: false,
    revision: 0,
    logs: [],
    past: [],
    future: [],
    load: (p) =>
      set({
        project: p,
        active: p.entry,
        dirty: false,
        past: [],
        future: [],
        revision: get().revision + 1,
      }),
    update: (fn) => {
      const old = get().project;
      const p = structuredClone(old);
      fn(p);
      p.modifiedAt = new Date().toISOString();
      set({
        project: p,
        dirty: true,
        past: [...get().past.slice(-79), old],
        future: [],
        revision: get().revision + 1,
      });
    },
    edit: (path, content) => {
      safePath(path);
      if (get().project.files.find((f) => f.path === path)?.content === content)
        return;
      get().update((p) => {
        const f = p.files.find((f) => f.path === path);
        if (f) f.content = content;
      });
    },
    select: (active) => set({ active }),
    parameter: (id, value) =>
      get().update((p) => {
        const item = p.parameters.find((x) => x.id === id);
        if (item) item.value = validateValue(item, value);
      }),
    undo: () => {
      const s = get();
      const p = s.past.at(-1);
      if (p)
        set({
          project: p,
          past: s.past.slice(0, -1),
          future: [s.project, ...s.future],
          dirty: true,
          revision: s.revision + 1,
        });
    },
    redo: () => {
      const s = get();
      const p = s.future[0];
      if (p)
        set({
          project: p,
          past: [...s.past, s.project],
          future: s.future.slice(1),
          dirty: true,
          revision: s.revision + 1,
        });
    },
    saved: () => set({ dirty: false }),
    log: (level, message) =>
      set((s) => ({
        logs: [
          ...s.logs.slice(-199),
          {
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString("es-AR"),
            level,
            message,
          },
        ],
      })),
    clear: () => set({ logs: [] }),
  }));

const devCache = globalThis as typeof globalThis & {
  __effectLabStore?: ReturnType<typeof createLabStore>;
};
export const useLab = import.meta.env.DEV
  ? (devCache.__effectLabStore ??= createLabStore())
  : createLabStore();
