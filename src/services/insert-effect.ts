import {
  createComposition,
  createLayer,
} from "../../packages/core/composition";
import { createProject, type LabProject } from "../../packages/core/project";

export function isBlankProject(project: LabProject) {
  const empty = createProject("", project.profile);
  return (
    (!project.composition || project.composition.layers.length === 0) &&
    !project.parameters.length &&
    project.files.length === empty.files.length &&
    project.files.every((f) =>
      empty.files.some((e) => e.path === f.path && e.content === f.content),
    )
  );
}

export function removeElement(project: LabProject, layerId?: string) {
  if (layerId && project.composition) {
    const c = project.composition;
    const removed = new Set([layerId]);
    for (let i = 0; i < c.layers.length; i++)
      for (const l of c.layers)
        if (l.parentId && removed.has(l.parentId)) removed.add(l.id);
    c.layers = c.layers.filter((l) => !removed.has(l.id));
    const refers = (target?: string) =>
      target?.startsWith("layer:") && removed.has(target.split(":")[1]);
    const removedNodes = new Set(
      c.nodes.filter((n) => refers(n.target)).map((n) => n.id),
    );
    c.nodes = c.nodes.filter((n) => !removedNodes.has(n.id));
    c.edges = c.edges.filter(
      (e) => !removedNodes.has(e.source) && !removedNodes.has(e.target),
    );
    c.tracks = c.tracks.filter((t) => !refers(t.target));
    if (!c.layers.some((l) => l.kind === "effect" && !l.source))
      project.parameters = [];
    if (c.layers.length) return;
  }
  const empty = createProject(project.name);
  project.files = empty.files;
  project.entry = empty.entry;
  project.profile = empty.profile;
  project.parameters = [];
  project.dependencies = [];
  project.composition = createComposition();
}

// Storage stays back-to-front for existing projects and the renderer.
// The inspector presents the same list front-to-back.
export function moveElement(
  project: LabProject,
  id: string,
  targetId: string,
  edge: "before" | "after",
) {
  if (!project.composition || id === targetId) return;
  const frontToBack = [...project.composition.layers].reverse();
  const index = frontToBack.findIndex((l) => l.id === id);
  if (index < 0 || !frontToBack.some((l) => l.id === targetId)) return;
  const [item] = frontToBack.splice(index, 1);
  const target = frontToBack.findIndex((l) => l.id === targetId);
  frontToBack.splice(target + (edge === "after" ? 1 : 0), 0, item);
  project.composition.layers = frontToBack.reverse();
}

export function insertEffect(
  project: LabProject,
  effect: LabProject,
  atBottom = false,
) {
  if (effect.composition?.enabled)
    throw Error("Este recurso es una composición. Abrilo como proyecto.");
  if (isBlankProject(project)) {
    const copy = structuredClone(effect);
    project.files = copy.files;
    project.parameters = copy.parameters;
    project.dependencies = copy.dependencies;
    project.entry = copy.entry;
    project.profile = copy.profile;
    project.composition = createComposition();
    project.composition.layers.push({
      ...createLayer("effect", effect.name),
      entry: project.entry,
    });
    return;
  }
  if (!project.composition) {
    project.composition = createComposition();
    project.composition.layers.push({
      ...createLayer("effect", project.name),
      entry: project.entry,
    });
  }
  project.composition.enabled = true;
  const layer = {
    ...createLayer("effect", effect.name),
    entry: effect.entry,
    source: structuredClone(effect),
    transparent: true,
  };
  if (atBottom) project.composition.layers.unshift(layer);
  else project.composition.layers.push(layer);
}
