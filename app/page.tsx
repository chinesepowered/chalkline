"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import AgentPanel from "@/components/AgentPanel";
import Canvas from "@/components/Canvas";
import * as D from "@/lib/diagram";
import { diagramTools } from "@/lib/tools";
import { registerTools } from "@/lib/webmcp";

const SYSTEM = `You are Chalkline's diagram co-author: an architect embedded in a collaborative diagram canvas that a human is editing at the same time.
Use the provided tools to build and modify the diagram. Rules:
- When the user describes a system, create the nodes with sensible kinds (user, service, database, queue, cache, storage, external, note), give each a one-sentence description, connect them with labelled edges, then call auto_layout.
- If a diagram already exists, call get_diagram first and build on it rather than duplicating nodes. The human may have moved, renamed, or added things since you last looked, so always re-read before editing.
- Prefer several small precise tool calls over one vague one. Do not invent nodes the user didn't ask for unless they asked for a full architecture.
- After you are done, reply in one or two short sentences describing what changed. Never paste JSON to the user.`;

const SUGGESTIONS = [
  "Draw a food delivery app architecture",
  "Add a Redis cache between the API and the database",
  "What would you improve about this design?",
  "Tidy this up",
];

export default function Home() {
  const state = useSyncExternalStore(D.subscribe, D.getState, D.getState);
  const [copied, setCopied] = useState(false);

  useEffect(() => registerTools(diagramTools), []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-neutral-900 dark:bg-black dark:text-neutral-100">
      <header className="flex items-center gap-3 border-b border-black/5 px-4 py-2 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-900 text-lg text-white dark:bg-white dark:text-black">✎</span>
          <div>
            <div className="text-sm font-bold leading-tight">Chalkline</div>
            <div className="text-[11px] text-neutral-500">A diagram canvas humans and agents draw on together</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="mr-2 hidden text-neutral-500 sm:inline">
            {state.nodes.length} nodes · {state.edges.length} edges
          </span>
          <ToolbarButton onClick={() => D.addNode({ label: "New service", kind: "service", by: "human" })}>+ Node</ToolbarButton>
          <ToolbarButton onClick={() => D.autoLayout("LR")}>Auto layout</ToolbarButton>
          <ToolbarButton onClick={() => D.loadSample()}>Sample</ToolbarButton>
          <ToolbarButton
            onClick={async () => {
              await navigator.clipboard.writeText(D.toMermaid());
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied!" : "Copy Mermaid"}
          </ToolbarButton>
          <ToolbarButton onClick={() => confirm("Clear the canvas?") && D.clear()}>Clear</ToolbarButton>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <Canvas />
        </main>
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-black/5 dark:border-white/10">
          <AgentPanel
            title="Co-author"
            systemPrompt={SYSTEM}
            suggestions={SUGGESTIONS}
            placeholder="Describe a system or ask for a change…"
            intro="Hi! Describe a system and I'll draw it. Move things around whenever you like; I read the canvas before every change."
          />
        </aside>
      </div>
    </div>
  );
}

function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-2 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}
