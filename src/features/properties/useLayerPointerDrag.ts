import {
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
} from "react";
type Destination = { id: string; edge: "before" | "after" };
type Gesture = {
  id: string;
  name: string;
  x: number;
  y: number;
  active: boolean;
  target: Destination | null;
};

export function useLayerPointerDrag(
  move: (id: string, target: string, edge: "before" | "after") => void,
) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(0);
  const [dragged, setDragged] = useState<string | null>(null);
  const [drop, setDrop] = useState<Destination | null>(null);
  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
    name: string;
  } | null>(null);
  function start(e: PointerEvent<HTMLElement>, id: string, name: string) {
    if (e.button !== 0) return;
    const control = (e.target as Element).closest(
      "button,input,select,textarea",
    );
    if (control && !control.classList.contains("layer-drag-handle")) return;
    gesture.current = {
      id,
      name,
      x: e.clientX,
      y: e.clientY,
      active: false,
      target: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function update(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    if (!g.active && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 5) return;
    e.preventDefault();
    g.active = true;
    setDragged(g.id);
    setGhost({ x: e.clientX + 12, y: e.clientY + 12, name: g.name });
    const panel = e.currentTarget.closest<HTMLElement>(".properties");
    const bounds = panel?.getBoundingClientRect();
    if (panel && bounds) {
      if (e.clientY > bounds.bottom - 35) panel.scrollTop += 18;
      if (e.clientY < bounds.top + 35) panel.scrollTop -= 18;
    }
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".inspector-component"),
    ];
    let target: Destination | null = null;
    if (bounds && e.clientX >= bounds.left && e.clientX <= bounds.right) {
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (e.clientY <= rect.bottom) {
          if (card.dataset.componentId !== g.id)
            target = {
              id: card.dataset.componentId!,
              edge: e.clientY < rect.top + rect.height / 2 ? "before" : "after",
            };
          break;
        }
      }
      if (
        !target &&
        cards.length &&
        e.clientY > cards.at(-1)!.getBoundingClientRect().bottom
      ) {
        const id = cards.at(-1)!.dataset.componentId!;
        if (id !== g.id) target = { id, edge: "after" };
      }
    }
    g.target = target;
    setDrop(target);
  }
  function finish(e: PointerEvent<HTMLElement>, cancel = false) {
    const g = gesture.current;
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    setDragged(null);
    setDrop(null);
    setGhost(null);
    if (!g?.active) return;
    e.preventDefault();
    suppressClick.current = performance.now() + 200;
    if (!cancel && g.target) move(g.id, g.target.id, g.target.edge);
  }
  function headerProps(id: string, name: string): HTMLAttributes<HTMLElement> {
    return {
      onPointerDown: (e) => start(e, id, name),
      onPointerMove: update,
      onPointerUp: (e) => finish(e),
      onPointerCancel: (e) => finish(e, true),
      onDragStart: (e) => e.preventDefault(),
      onClick: (e) => {
        if (performance.now() < suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    };
  }
  return { dragged, drop, ghost, headerProps };
}
