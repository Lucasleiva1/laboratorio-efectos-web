import type { Compiled } from "../../services/compiler";
import type { Parameter } from "../../../packages/parameter-schema";
export const PROTOCOL = 1;
function bridge(config: {
  session: string;
  projectId: string;
  parameters: Parameter[];
}) {
  const { session, projectId } = config;
  const send = (type: string, data: unknown) =>
    parent.postMessage({ protocol: 1, session, projectId, type, data }, "*");
  const values: Record<string, unknown> = Object.create(null);
  let schema = config.parameters;
  const registered = new Map<string, Parameter>();
  const listeners = new Set<(p: Record<string, unknown>) => void>();
  const disposers = new Set<() => void>();
  let paused = false;
  for (const p of schema) values[p.binding] = p.value;
  const safe = (v: unknown): unknown => {
    try {
      return typeof v === "string" ? v : JSON.parse(JSON.stringify(v));
    } catch {
      return String(v);
    }
  };
  for (const level of ["log", "info", "warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      send("log", {
        level,
        message: args
          .map((v) => (typeof v === "string" ? v : JSON.stringify(safe(v))))
          .join(" "),
      });
    };
  }
  window.addEventListener("error", (e) =>
    send("error", { message: e.message, file: e.filename, line: e.lineno }),
  );
  window.addEventListener("unhandledrejection", (e) =>
    send("error", { message: String(e.reason?.stack ?? e.reason) }),
  );
  const apply = () => {
    for (const [key, value] of Object.entries(values))
      document.documentElement.style.setProperty("--" + key, String(value));
    for (const fn of listeners) {
      try {
        fn({ ...values });
      } catch (e) {
        console.error(e);
      }
    }
  };
  const api = {
    params: values,
    register: (
      definitions: Parameter[],
      listener?: (p: Record<string, unknown>) => void,
    ) => {
      for (const p of definitions) {
        const stored = config.parameters.find((s) => s.binding === p.binding);
        let value = stored?.value ?? p.defaultValue;
        if (typeof value !== typeof p.defaultValue) value = p.defaultValue;
        if (typeof value === "number")
          value = Math.max(
            p.min ?? -Infinity,
            Math.min(p.max ?? Infinity, value),
          );
        values[p.binding] = value;
        registered.set(p.binding, { ...p, value } as Parameter);
      }
      schema = [...registered.values()];
      if (listener) listeners.add(listener);
      apply();
      send("parameters", schema);
      return values;
    },
    onChange: (fn: (p: Record<string, unknown>) => void) => {
      listeners.add(fn);
      fn({ ...values });
      return () => listeners.delete(fn);
    },
    onDispose: (fn: () => void) => {
      disposers.add(fn);
    },
    get paused() {
      return paused;
    },
  };
  Object.defineProperty(window, "lab", { value: api, writable: false });
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (
      e.source !== parent ||
      !m ||
      m.protocol !== 1 ||
      m.session !== session ||
      m.projectId !== projectId
    )
      return;
    if (m.type === "parameter") {
      const p = schema.find(
        (p) => p.id === m.data?.id || p.binding === m.data?.binding,
      );
      if (!p) return;
      const v = m.data.value;
      if (
        typeof v !== typeof p.defaultValue ||
        (typeof v === "number" &&
          (!Number.isFinite(v) ||
            v < (p.min ?? -Infinity) ||
            v > (p.max ?? Infinity)))
      )
        return;
      values[p.binding] = v;
      apply();
      send("ack", { id: p.id });
    }
    if (m.type === "pause") {
      paused = Boolean(m.data);
      window.dispatchEvent(new CustomEvent("lab:pause", { detail: paused }));
    }
    if (m.type === "dispose") {
      for (const fn of disposers) {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (m.type === "inspect")
      document.body.dataset.labInspect = String(Boolean(m.data));
    if (m.type === "timeline")
      window.dispatchEvent(new CustomEvent("lab:timeline", { detail: m.data }));
  });
  document.addEventListener(
    "click",
    (e) => {
      if (document.body.dataset.labInspect === "true") {
        e.preventDefault();
        e.stopPropagation();
        const el = e.target as HTMLElement;
        send("selection", {
          tag: el.tagName,
          id: el.id,
          classes: el.className,
          text: el.textContent?.slice(0, 160),
        });
      }
    },
    true,
  );
  let count = 0,
    last = performance.now(),
    frames: number[] = [];
  const tick = (time: number) => {
    frames.push(time - last);
    last = time;
    count++;
    if (count >= 60) {
      const sorted = [...frames].sort((a, b) => a - b);
      send("metrics", {
        fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
        p95: sorted[Math.floor(sorted.length * 0.95)],
      });
      count = 0;
      frames = [];
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener(
    "webglcontextlost",
    () =>
      send("error", {
        message: "Contexto WebGL perdido. Reiniciá la vista previa.",
      }),
    true,
  );
  let pointerSent = 0;
  window.addEventListener("pointermove", (e) => {
    if (performance.now() - pointerSent > 30) {
      pointerSent = performance.now();
      send("pointer", {
        x: e.clientX / innerWidth,
        y: e.clientY / innerHeight,
      });
    }
  });
  apply();
  send("ready", null);
  setTimeout(() => send("parameters", [...registered.values()]), 0);
}
export function runtimeDocument(
  compiled: Compiled,
  session: string,
  projectId: string,
  parameters: Parameter[],
): string {
  const doc = new DOMParser().parseFromString(compiled.html, "text/html");
  const meta = doc.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content =
    "default-src 'none'; script-src 'nonce-effectlab-preview' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src data: blob:; worker-src blob:; frame-src about: blob: data:; base-uri 'none'; form-action 'none'";
  doc.head.prepend(meta);
  const style = doc.createElement("style");
  style.textContent = "html,body{min-height:100%;margin:0}" + compiled.css;
  doc.head.append(style);
  const boot = doc.createElement("script");
  boot.setAttribute("nonce", "effectlab-preview");
  boot.textContent = `(${bridge.toString()})(${JSON.stringify({ session, projectId, parameters }).replaceAll("<", "\\u003c")});`;
  doc.head.append(boot);
  const script = doc.createElement("script");
  script.setAttribute("nonce", "effectlab-preview");
  script.textContent = compiled.js;
  doc.body.append(script);
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
export function validMessage(
  e: MessageEvent,
  source: Window | null,
  session: string,
  projectId: string,
): boolean {
  const m = e.data;
  return (
    e.source === source &&
    m?.protocol === PROTOCOL &&
    m.session === session &&
    m.projectId === projectId &&
    [
      "ready",
      "log",
      "error",
      "parameters",
      "ack",
      "metrics",
      "selection",
    ].includes(m.type)
  );
}
