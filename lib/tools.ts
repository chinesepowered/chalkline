import type { ToolDef } from "@/lib/webmcp";
import * as D from "@/lib/diagram";

const kindEnum = { type: "string", enum: [...D.KINDS], description: "What the node represents." };

/**
 * The WebMCP tools Chalkline exposes to agents. Every tool mutates (or reads)
 * the same diagram the human is editing on the canvas.
 */
export const diagramTools: ToolDef[] = [
  {
    name: "get_diagram",
    description:
      "Read the current diagram: every node (id, label, kind, description, who added it) and every edge. Call this first before modifying an existing diagram so you can reference existing node ids.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => D.summary(),
  },
  {
    name: "add_node",
    description:
      "Add a node (box) to the diagram. Returns the node id to use in later calls. Position is chosen automatically; call auto_layout after adding several nodes.",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Short display name, e.g. 'Payment Service'." },
        kind: kindEnum,
        description: { type: "string", description: "One sentence about the component's responsibility." },
        id: { type: "string", description: "Optional stable id (snake_case)." },
      },
      required: ["label", "kind"],
    },
    execute: (a) => {
      const n = D.addNode({
        label: String(a.label),
        kind: a.kind as D.Kind,
        description: a.description ? String(a.description) : undefined,
        id: a.id ? String(a.id) : undefined,
        by: "agent",
      });
      return `Added node id="${n.id}" label="${n.data.label}" kind=${n.data.kind}`;
    },
  },
  {
    name: "update_node",
    description: "Rename, re-type, or re-describe an existing node. Reference it by id or label.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node id or label." },
        label: { type: "string" },
        kind: kindEnum,
        description: { type: "string" },
      },
      required: ["node"],
    },
    execute: (a) => {
      const patch: Partial<D.NodeData> = {};
      if (a.label) patch.label = String(a.label);
      if (a.kind) patch.kind = a.kind as D.Kind;
      if (a.description) patch.description = String(a.description);
      const n = D.updateNode(String(a.node), patch, "agent");
      if (!n) throw new Error(`No node matching "${a.node}"`);
      return `Updated ${n.id}: ${JSON.stringify({ label: n.data.label, kind: n.data.kind })}`;
    },
  },
  {
    name: "remove_node",
    description: "Delete a node and every edge attached to it.",
    inputSchema: { type: "object", properties: { node: { type: "string", description: "Node id or label." } }, required: ["node"] },
    annotations: { destructiveHint: true },
    execute: (a) => {
      const n = D.removeNode(String(a.node));
      if (!n) throw new Error(`No node matching "${a.node}"`);
      return `Removed ${n.id}`;
    },
  },
  {
    name: "connect",
    description: "Draw a directed edge from one node to another, optionally labelled with the protocol or data that flows (e.g. 'gRPC', 'events').",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source node id or label." },
        to: { type: "string", description: "Target node id or label." },
        label: { type: "string", description: "Optional edge label." },
      },
      required: ["from", "to"],
    },
    execute: (a) => {
      const r = D.connect(String(a.from), String(a.to), a.label ? String(a.label) : undefined, "agent");
      if ("error" in r) throw new Error(r.error);
      return `Connected ${r.edge.source} -> ${r.edge.target}${a.label ? ` (${a.label})` : ""}`;
    },
  },
  {
    name: "disconnect",
    description: "Remove the edge between two nodes.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    },
    execute: (a) => (D.disconnect(String(a.from), String(a.to)) ? "Edge removed" : "No such edge"),
  },
  {
    name: "auto_layout",
    description: "Tidy the diagram with an automatic layered layout. Use after adding or connecting several nodes.",
    inputSchema: {
      type: "object",
      properties: { direction: { type: "string", enum: ["LR", "TB"], description: "Left-to-right or top-to-bottom." } },
    },
    execute: (a) => {
      D.autoLayout(a.direction === "TB" ? "TB" : "LR");
      return `Laid out ${D.getState().nodes.length} nodes`;
    },
  },
  {
    name: "highlight_nodes",
    description: "Select/highlight nodes on the canvas so the human can see what you are talking about.",
    inputSchema: {
      type: "object",
      properties: { nodes: { type: "array", items: { type: "string" }, description: "Node ids or labels." } },
      required: ["nodes"],
    },
    annotations: { readOnlyHint: true },
    execute: (a) => `Highlighted ${D.select((a.nodes as string[]) ?? []).join(", ") || "nothing"}`,
  },
  {
    name: "clear_diagram",
    description: "Remove everything from the canvas. Only call when the user clearly asks to start over.",
    inputSchema: { type: "object", properties: {} },
    annotations: { destructiveHint: true },
    execute: () => {
      D.clear();
      return "Canvas cleared";
    },
  },
  {
    name: "export_mermaid",
    description: "Return the diagram as Mermaid flowchart source, useful for pasting into docs or README files.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => D.toMermaid(),
  },
];
