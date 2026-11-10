import { describe, it, expect } from "vitest";
import {
  reviewProject,
  useReview,
  resolveProposal,
} from "../src/services/review";
import { useLab } from "../src/stores/lab";
import { createProject } from "../packages/core/project";
describe("Revisión de cambios", () => {
  it("rechaza propuestas contra revisiones obsoletas", () => {
    const state = useLab.getState();
    expect(() =>
      reviewProject("Obsoleta", state.project, state.revision - 1),
    ).toThrow("revision_conflict");
  });
  it("rechazar preserva el estado actual", async () => {
    const before = useLab.getState().project;
    const promise = reviewProject(
      "No aplicar",
      createProject("Otro"),
      useLab.getState().revision,
    );
    const reject = expect(promise).rejects.toThrow("permission_denied");
    await resolveProposal(useReview.getState().queue[0].id, false);
    await reject;
    expect(useLab.getState().project).toBe(before);
  });
  it("revocar autorización bloquea una propuesta pendiente", async () => {
    const state = useLab.getState();
    const promise = reviewProject(
      "Revocada",
      state.project,
      state.revision,
      () => false,
    );
    const rejected = expect(promise).rejects.toThrow("revocada");
    await resolveProposal(useReview.getState().queue[0].id, true);
    await rejected;
  });
});
