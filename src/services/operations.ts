import tools from "../../packages/agent-contracts/tools.json";
import {
  createProject,
  parseProject,
  safePath,
  type LabProject,
} from "../../packages/core/project";
import { validateValue, type Parameter } from "../../packages/parameter-schema";
import { useLab } from "../stores/lab";
import { loadLibrary, useLibrary, checkpoint } from "./library";
import { reviewProject } from "./review";
import { prepareProject } from "./composition-runtime";
import { buildExport, writeExport, type ExportTarget } from "./exporter";
import { confirmAction } from "../components/Dialogs";
export function validateToolArgs(name: string, args: Record<string, unknown>) {
  const spec = tools.find((t) => t.name === name);
  if (!spec) throw Error("unsupported_capability");
  if (!args || typeof args !== "object" || Array.isArray(args))
    throw Error("Argumentos inválidos");
  const schema = spec.inputSchema as unknown as {
    properties: Record<string, { type?: string; enum?: unknown[] }>;
    required?: string[];
  };
  for (const required of schema.required ?? [])
    if (args[required] === undefined) throw Error("Falta " + required);
  for (const [key, value] of Object.entries(args)) {
    const prop = schema.properties[key];
    if (!prop) throw Error("Argumento no permitido: " + key);
    if (prop.enum && !prop.enum.includes(value))
      throw Error("Opción inválida: " + key);
    if (prop.type === "integer" && !Number.isSafeInteger(value))
      throw Error("Entero requerido: " + key);
    if (prop.type && prop.type !== "integer" && typeof value !== prop.type)
      throw Error("Tipo inválido: " + key);
  }
  if (JSON.stringify(args).length > 2 * 1024 * 1024)
    throw Error("Solicitud demasiado grande");
}
export async function executeOperation(
  name: string,
  args: Record<string, any>,
  authorized: () => boolean = () => true,
): Promise<unknown> {
  if (!authorized()) throw Error("permission_denied");
  validateToolArgs(name, args);
  const lab = useLab.getState();
  if (args.projectId && args.projectId !== lab.project.id)
    throw Error("project_scope_denied");
  if (
    args.expectedRevision !== undefined &&
    args.expectedRevision !== lab.revision
  )
    throw Error("revision_conflict");
  if (name === "effectlab_status")
    return {
      version: "0.1.0",
      projectId: lab.project.id,
      revision: lab.revision,
      capabilities: tools.map((t) => t.name),
    };
  if (name === "list_projects") {
    await loadLibrary();
    return [
      { id: lab.project.id, name: lab.project.name, active: true },
      ...useLibrary
        .getState()
        .data.items.map((i) => ({
          id: i.project.id,
          name: i.name,
          active: false,
        })),
    ];
  }
  if (name === "get_project")
    return { project: lab.project, revision: lab.revision };
  if (name === "list_project_files")
    return lab.project.files.map((f) => ({
      path: f.path,
      bytes: new TextEncoder().encode(f.content).length,
    }));
  if (name === "read_project_file") {
    safePath(args.path);
    const file = lab.project.files.find((f) => f.path === args.path);
    if (!file) throw Error("file_not_found");
    return file;
  }
  if (name === "list_effects")
    return {
      entry: lab.project.entry,
      layers:
        lab.project.composition?.layers.filter((l) => l.kind === "effect") ??
        [],
    };
  if (name === "list_effect_parameters") return lab.project.parameters;
  if (name === "list_project_versions") {
    await loadLibrary();
    return useLibrary
      .getState()
      .data.revisions.filter((r) => r.projectId === lab.project.id)
      .map(({ project, ...r }) => r);
  }
  if (name === "get_preview_diagnostics") return lab.logs;
  if (name === "validate_effect") {
    const c = await prepareProject(lab.project);
    return {
      ok: true,
      bytes: c.bytes,
      dependencies: c.dependencies,
      compileMs: c.duration,
    };
  }
  if (name === "run_preview") {
    if (
      !(await confirmAction(
        "¿Ejecutar el código del proyecto por solicitud MCP?",
      ))
    )
      throw Error("permission_denied");
    if (!authorized()) throw Error("permission_denied");
    window.dispatchEvent(new Event("lab:run-preview"));
    return { requested: true, diagnosticsTool: "get_preview_diagnostics" };
  }
  if (name === "export_effect") {
    if (
      !(await confirmAction(
        "¿Preparar una exportación solicitada por MCP y elegir dónde guardarla?",
      ))
    )
      throw Error("permission_denied");
    if (!authorized()) throw Error("permission_denied");
    const p = await buildExport(lab.project, args.target as ExportTarget);
    return {
      saved: await writeExport(p),
      bytes: p.bytes,
      zipBytes: p.zip.length,
      name: p.name,
    };
  }
  if (name === "create_checkpoint") {
    if (
      !(await confirmAction(
        "¿Guardar la revisión solicitada: " + args.note + "?",
      ))
    )
      throw Error("permission_denied");
    return checkpoint(lab.project, args.note);
  }
  let next = structuredClone(lab.project);
  if (name === "create_project") next = createProject(args.name, args.profile);
  if (name === "write_project_file" || name === "create_effect") {
    safePath(args.path);
    if (typeof args.content !== "string") throw Error("Código inválido");
    const file = next.files.find((f) => f.path === args.path);
    if (file) file.content = args.content;
    else next.files.push({ path: args.path, content: args.content });
  }
  if (name === "apply_file_patch") {
    safePath(args.path);
    const file = next.files.find((f) => f.path === args.path);
    if (!file || !args.before || file.content.split(args.before).length !== 2)
      throw Error(
        "patch_conflict: el fragmento debe coincidir exactamente una vez",
      );
    file.content = file.content.replace(args.before, args.after);
  }
  if (name === "remove_effect") {
    if (!next.composition?.layers.some((l) => l.id === args.layerId))
      throw Error("layer_not_found");
    next.composition.layers = next.composition.layers.filter(
      (l) => l.id !== args.layerId,
    );
  }
  if (name === "create_control") {
    const control = args.control as Parameter;
    if (next.parameters.some((p) => p.id === control.id))
      throw Error("control_id_exists");
    next.parameters.push(control);
  }
  if (name === "update_control") {
    const control = next.parameters.find((p) => p.id === args.controlId);
    if (!control) throw Error("control_not_found");
    Object.assign(control, args.patch);
  }
  if (name === "remove_control")
    next.parameters = next.parameters.filter((p) => p.id !== args.controlId);
  if (name === "set_effect_parameter") {
    const p = next.parameters.find(
      (p) => p.id === args.parameterId || p.binding === args.parameterId,
    );
    if (!p) throw Error("parameter_not_found");
    p.value = validateValue(p, args.value);
  }
  parseProject(JSON.stringify(next));
  return reviewProject("MCP · " + name, next, lab.revision, authorized);
}
export async function proposeAgentResult(
  raw: string,
  projectId: string,
  revision: number,
) {
  const lab = useLab.getState();
  if (lab.project.id !== projectId || lab.revision !== revision)
    throw Error("revision_conflict: conservamos tus cambios manuales");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.files) || !Array.isArray(data.parameters))
    throw Error("Respuesta incompleta: faltan files y parameters");
  const next = structuredClone(lab.project);
  for (const f of data.files) {
    safePath(f.path);
    if (typeof f.content !== "string") throw Error("Archivo inválido");
    const old = next.files.find((v) => v.path === f.path);
    if (old) old.content = f.content;
    else next.files.push(f);
  }
  next.parameters = data.parameters;
  parseProject(JSON.stringify(next));
  return reviewProject(
    data.summary || "Cambios propuestos por IA",
    next,
    revision,
  );
}
