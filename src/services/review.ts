import { create } from "zustand";
import { parseProject, type LabProject } from "../../packages/core/project";
import { useLab } from "../stores/lab";
import { checkpoint } from "./library";
export interface ChangeProposal {
  id: string;
  title: string;
  projectId: string;
  expectedRevision: number;
  before: LabProject;
  after: LabProject;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  authorized?: () => boolean;
}
export const useReview = create<{ queue: ChangeProposal[] }>(() => ({
  queue: [],
}));
export function reviewProject(
  title: string,
  after: LabProject,
  expectedRevision: number,
  authorized?: () => boolean,
): Promise<unknown> {
  const lab = useLab.getState();
  if (lab.revision !== expectedRevision)
    throw Error("revision_conflict: el proyecto cambió");
  parseProject(JSON.stringify(after));
  if (useReview.getState().queue.length >= 8)
    throw Error("Demasiadas propuestas pendientes");
  return new Promise((resolve, reject) => {
    const proposal = {
      id: crypto.randomUUID(),
      title,
      projectId: lab.project.id,
      expectedRevision,
      before: structuredClone(lab.project),
      after: structuredClone(after),
      resolve,
      reject,
      authorized,
    };
    useReview.setState((s) => ({ queue: [...s.queue, proposal] }));
    setTimeout(() => {
      if (useReview.getState().queue.some((p) => p.id === proposal.id)) {
        reject(Error("approval_timeout"));
        useReview.setState((s) => ({
          queue: s.queue.filter((p) => p.id !== proposal.id),
        }));
      }
    }, 115000);
  });
}
export async function resolveProposal(id: string, accept: boolean) {
  const proposal = useReview.getState().queue.find((p) => p.id === id);
  if (!proposal) return;
  try {
    if (!accept) throw Error("permission_denied: propuesta rechazada");
    if (proposal.authorized && !proposal.authorized())
      throw Error("permission_denied: autorización revocada");
    const lab = useLab.getState();
    if (
      lab.project.id !== proposal.projectId ||
      lab.revision !== proposal.expectedRevision
    )
      throw Error("revision_conflict: cambió el proyecto mientras se revisaba");
    await checkpoint(lab.project, "Antes de " + proposal.title);
    if (useLab.getState().revision !== proposal.expectedRevision)
      throw Error("revision_conflict");
    lab.update((p) => Object.assign(p, proposal.after));
    if (!proposal.after.files.some((f) => f.path === useLab.getState().active))
      lab.select(proposal.after.entry);
    proposal.resolve({
      ok: true,
      revision: useLab.getState().revision,
      projectId: proposal.after.id,
    });
    lab.log("info", "Cambio aprobado: " + proposal.title);
  } catch (e) {
    proposal.reject(e instanceof Error ? e : Error(String(e)));
  } finally {
    useReview.setState((s) => ({ queue: s.queue.filter((p) => p.id !== id) }));
  }
}
