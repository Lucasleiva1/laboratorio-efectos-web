import { controlRenderers } from "../properties/Inspector";
import { validateValue } from "../../../packages/parameter-schema";
import { useLab } from "../../stores/lab";
export default function SourceLayerControls({ layerId }: { layerId: string }) {
  const source = useLab(
    (s) => s.project.composition?.layers.find((l) => l.id === layerId)?.source,
  );
  if (!source?.parameters.length) return null;
  return (
    <div className="source-layer-controls">
      <span className="mini-label">PARÁMETROS DEL RECURSO</span>
      {source.parameters
        .filter((p) => !p.hidden)
        .map((p) => {
          const Control = controlRenderers[p.widget];
          return (
            <div className="control" key={p.id}>
              <label>{p.label}</label>
              {Control ? (
                <Control
                  p={p}
                  change={(value) => {
                    try {
                      const v = validateValue(p, value);
                      useLab.getState().update((project) => {
                        project
                          .composition!.layers.find((l) => l.id === layerId)!
                          .source!.parameters.find(
                            (param) => param.id === p.id,
                          )!.value = v;
                      });
                    } catch (e) {
                      useLab.getState().log("error", String(e));
                    }
                  }}
                />
              ) : (
                <p>Widget no registrado: {p.widget}</p>
              )}
            </div>
          );
        })}
      <p className="helper">
        Editar parámetros del recurso recompone su vista previa. El recurso
        original de biblioteca se conserva.
      </p>
    </div>
  );
}
