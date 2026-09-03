import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

export const KINDS = ["service", "database", "queue", "cache", "user", "external", "storage", "note"] as const;
export type Kind = (typeof KINDS)[number];

export type NodeData = {
  label: string;
  kind: Kind;
  description?: string;
  by: "agent" | "human";
  at: number;
  [key: string]: unknown;
};

export type DNode = Node<NodeData, "box">;
export type DEdge = Edge;

export const KIND_STYLE: Record<Kind, { icon: string; bg: string; ring: string; text: string }> = {
  service: { icon: "▣", bg: "bg-sky-50 dark:bg-sky-950", ring: "border-sky-400", text: "text-sky-700 dark:text-sky-300" },
  database: { icon: "🛢", bg: "bg-amber-50 dark:bg-amber-950", ring: "border-amber-400", text: "text-amber-700 dark:text-amber-300" },
  queue: { icon: "≋", bg: "bg-violet-50 dark:bg-violet-950", ring: "border-violet-400", text: "text-violet-700 dark:text-violet-300" },
  cache: { icon: "⚡", bg: "bg-rose-50 dark:bg-rose-950", ring: "border-rose-400", text: "text-rose-700 dark:text-rose-300" },
  user: { icon: "👤", bg: "bg-emerald-50 dark:bg-emerald-950", ring: "border-emerald-400", text: "text-emerald-700 dark:text-emerald-300" },
  external: { icon: "☁", bg: "bg-neutral-100 dark:bg-neutral-800", ring: "border-neutral-400", text: "text-neutral-700 dark:text-neutral-300" },
  storage: { icon: "🗄", bg: "bg-orange-50 dark:bg-orange-950", ring: "border-orange-400", text: "text-orange-700 dark:text-orange-300" },
  note: { icon: "✎", bg: "bg-yellow-50 dark:bg-yellow-900", ring: "border-yellow-400", text: "text-yellow-800 dark:text-yellow-200" },
};

type State = { nodes: DNode[]; edges: DEdge[]; selected: string[]; fitVersion: number };

let state: State = { nodes: [], edges: [], selected: [], fitVersion: 0 };
const listeners = new Set<() => void>();
const STORAGE_KEY = "chalkline:diagram";

function emit() {
  for (const l of listeners) l();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: state.nodes, edges: state.edges }));
    } catch {}
  }
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function getState() {
  return state;
}

export function hydrate() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { nodes: DNode[]; edges: DEdge[] };
      state = { ...state, nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] };
      for (const l of listeners) l();
    }
  } catch {}
}

export function slug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "node";
}

function uniqueId(base: string) {
  let id = base;
  let i = 2;
  while (state.nodes.some((n) => n.id === id)) id = `${base}_${i++}`;
  return id;
}

export function findNode(ref: string): DNode | undefined {
  const r = ref.trim().toLowerCase();
  return (
    state.nodes.find((n) => n.id.toLowerCase() === r) ??
    state.nodes.find((n) => n.data.label.toLowerCase() === r) ??
    state.nodes.find((n) => slug(n.data.label) === slug(r)) ??
    state.nodes.find((n) => n.data.label.toLowerCase().includes(r))
  );
}

function edgeStyle(label?: string): Partial<DEdge> {
  return {
    label,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    style: { strokeWidth: 1.6 },
    labelStyle: { fontSize: 11 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
  };
}

/* ---------- actions ---------- */

export function setNodes(nodes: DNode[]) {
  state = { ...state, nodes };
  emit();
}
export function setEdges(edges: DEdge[]) {
  state = { ...state, edges };
  emit();
}

export function addNode(input: { id?: string; label: string; kind?: Kind; description?: string; by: "agent" | "human"; x?: number; y?: number }) {
  const id = uniqueId(input.id ? slug(input.id) : slug(input.label));
  const kind: Kind = KINDS.includes(input.kind as Kind) ? (input.kind as Kind) : "service";
  const idx = state.nodes.length;
  const node: DNode = {
    id,
    type: "box",
    position: { x: input.x ?? 80 + (idx % 4) * 240, y: input.y ?? 80 + Math.floor(idx / 4) * 140 },
    data: { label: input.label, kind, description: input.description, by: input.by, at: Date.now() },
  };
  state = { ...state, nodes: [...state.nodes, node], fitVersion: input.by === "agent" ? state.fitVersion + 1 : state.fitVersion };
  emit();
  return node;
}

export function updateNode(ref: string, patch: Partial<Pick<NodeData, "label" | "kind" | "description">>, by: "agent" | "human") {
  const n = findNode(ref);
  if (!n) return null;
  state = {
    ...state,
    nodes: state.nodes.map((x) => (x.id === n.id ? { ...x, data: { ...x.data, ...patch, by, at: Date.now() } } : x)),
  };
  emit();
  return findNode(n.id)!;
}

export function removeNode(ref: string) {
  const n = findNode(ref);
  if (!n) return null;
  state = {
    ...state,
    nodes: state.nodes.filter((x) => x.id !== n.id),
    edges: state.edges.filter((e) => e.source !== n.id && e.target !== n.id),
  };
  emit();
  return n;
}

export function connect(fromRef: string, toRef: string, label?: string, by: "agent" | "human" = "agent") {
  const a = findNode(fromRef);
  const b = findNode(toRef);
  if (!a || !b) return { error: `Could not find ${!a ? fromRef : toRef}` };
  const existing = state.edges.find((e) => e.source === a.id && e.target === b.id);
  if (existing) {
    state = { ...state, edges: state.edges.map((e) => (e.id === existing.id ? { ...e, ...edgeStyle(label ?? (existing.label as string)) } : e)) };
    emit();
    return { edge: existing };
  }
  const edge: DEdge = { id: `${a.id}->${b.id}`, source: a.id, target: b.id, data: { by }, ...edgeStyle(label) };
  state = { ...state, edges: [...state.edges, edge] };
  emit();
  return { edge };
}

export function disconnect(fromRef: string, toRef: string) {
  const a = findNode(fromRef);
  const b = findNode(toRef);
  if (!a || !b) return false;
  const before = state.edges.length;
  state = { ...state, edges: state.edges.filter((e) => !(e.source === a.id && e.target === b.id)) };
  emit();
  return state.edges.length < before;
}

export function autoLayout(direction: "LR" | "TB" = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 90, marginx: 40, marginy: 40 });
  for (const n of state.nodes) g.setNode(n.id, { width: 200, height: 72 });
  for (const e of state.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  state = {
    ...state,
    fitVersion: state.fitVersion + 1,
    nodes: state.nodes.map((n) => {
      const p = g.node(n.id);
      return { ...n, position: { x: p.x - 100, y: p.y - 36 } };
    }),
  };
  emit();
}

export function clear() {
  state = { nodes: [], edges: [], selected: [], fitVersion: state.fitVersion + 1 };
  emit();
}

export function select(ids: string[]) {
  const resolved = ids.map((r) => findNode(r)?.id).filter((x): x is string => !!x);
  state = { ...state, selected: resolved, fitVersion: state.fitVersion + 1, nodes: state.nodes.map((n) => ({ ...n, selected: resolved.includes(n.id) })) };
  emit();
  return resolved;
}

export function summary() {
  return {
    nodes: state.nodes.map((n) => ({ id: n.id, label: n.data.label, kind: n.data.kind, description: n.data.description, by: n.data.by })),
    edges: state.edges.map((e) => ({ from: e.source, to: e.target, label: e.label ?? undefined })),
  };
}

export function toMermaid() {
  const lines = ["flowchart LR"];
  for (const n of state.nodes) {
    const l = n.data.label.replace(/"/g, "'");
    const shape =
      n.data.kind === "database" || n.data.kind === "storage"
        ? `[("${l}")]`
        : n.data.kind === "user"
          ? `(("${l}"))`
          : n.data.kind === "queue"
            ? `[["${l}"]]`
            : n.data.kind === "note"
              ? `>"${l}"]`
              : `["${l}"]`;
    lines.push(`  ${n.id}${shape}`);
  }
  for (const e of state.edges) {
    lines.push(e.label ? `  ${e.source} -->|${String(e.label).replace(/\|/g, "/")}| ${e.target}` : `  ${e.source} --> ${e.target}`);
  }
  return lines.join("\n");
}

export function loadSample() {
  clear();
  const by = "human" as const;
  addNode({ label: "Browser", kind: "user", by });
  addNode({ label: "API Gateway", kind: "service", by });
  addNode({ label: "Orders DB", kind: "database", by });
  connect("Browser", "API Gateway", "HTTPS", by);
  connect("API Gateway", "Orders DB", "SQL", by);
  autoLayout("LR");
}
