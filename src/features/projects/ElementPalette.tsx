import { compositionElements } from "./elements";
import { insertEffect } from "../../services/insert-effect";
import { useLab } from "../../stores/lab";
export default function ElementPalette() {
  return (
    <details className="explorer-section element-palette" open>
      <summary>Elementos para componer</summary>
      <ul className="element-list">
        {compositionElements.map((element) => (
          <li key={element.id}>
            <button
              title={"Agregar " + element.name}
              aria-label={"Agregar " + element.name}
              onClick={() => {
                try {
                  useLab.getState().update((p) => insertEffect(p, element));
                } catch (error) {
                  useLab.getState().log("error", String(error));
                }
              }}
            >
              {element.name}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
