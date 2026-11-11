import { it, expect } from "vitest";
import { createProject } from "../packages/core/project";
import { useLab } from "../src/stores/lab";
import {
  saveWithFeedback,
  type SaveFeedback,
} from "../src/services/save-feedback";
function setup() {
  useLab.getState().load(createProject("Guardar"));
  useLab.getState().edit("main.js", "// cambio");
  return [] as SaveFeedback[];
}
it("indica guardando hasta que la escritura termina y luego confirma el guardado", async () => {
  const states = setup();
  let done!: (value: boolean) => void;
  const saving = saveWithFeedback(
    false,
    (s) => states.push(s),
    async () => new Promise((resolve) => (done = resolve)),
  );
  expect(states.map((s) => s.phase)).toEqual(["saving"]);
  expect(useLab.getState().dirty).toBe(true);
  done(true);
  await saving;
  expect(states.map((s) => s.phase)).toEqual(["saving", "saved"]);
  expect(states[1].time).toBeTruthy();
  expect(useLab.getState().dirty).toBe(false);
});
it("no borra cambios realizados mientras se guarda una versión anterior", async () => {
  const states = setup();
  let done!: (value: boolean) => void;
  const saving = saveWithFeedback(
    false,
    (s) => states.push(s),
    async () => new Promise((resolve) => (done = resolve)),
  );
  useLab.getState().edit("main.js", "// nuevo cambio");
  done(true);
  await saving;
  expect(states[1].phase).toBe("saved");
  expect(useLab.getState().dirty).toBe(true);
});
it("cancelar o fallar conserva los cambios y nunca confirma un guardado", async () => {
  const states = setup();
  await saveWithFeedback(
    true,
    (s) => states.push(s),
    async (_, as) => {
      expect(as).toBe(true);
      return false;
    },
  );
  expect(states.at(-1)?.phase).toBe("cancelled");
  expect(useLab.getState().dirty).toBe(true);
  await saveWithFeedback(
    false,
    (s) => states.push(s),
    async () => {
      throw Error("Archivo bloqueado");
    },
  );
  expect(states.at(-1)?.phase).toBe("error");
  expect(states.at(-1)?.error).toBe("Archivo bloqueado");
  expect(useLab.getState().dirty).toBe(true);
});
