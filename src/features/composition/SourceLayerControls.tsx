import { ParameterSections } from "../properties/ParameterControls";
import { validateValue } from "../../../packages/parameter-schema";
import { useLab } from "../../stores/lab";
export default function SourceLayerControls({ layerId }: { layerId: string }) {
  const source = useLab(
    (s) => s.project.composition?.layers.find((l) => l.id === layerId)?.source,
  );
  if (!source) return null;
  return (
    <ParameterSections
      parameters={source.parameters}
      change={(id, value) => {
        try {
          const p = source.parameters.find((p) => p.id === id)!;
          const validated = validateValue(p, value);
          useLab.getState().update((project) => {
            project
              .composition!.layers.find((l) => l.id === layerId)!
              .source!.parameters.find((p) => p.id === id)!.value = validated;
          });
        } catch (error) {
          useLab.getState().log("error", String(error));
        }
      }}
    />
  );
}
