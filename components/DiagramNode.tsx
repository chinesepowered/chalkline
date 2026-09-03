"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import { KIND_STYLE, updateNode, type DNode } from "@/lib/diagram";

export default function DiagramNode({ id, data, selected }: NodeProps<DNode>) {
  const s = KIND_STYLE[data.kind] ?? KIND_STYLE.service;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const [fresh, setFresh] = useState(Date.now() - data.at < 4000);

  useEffect(() => {
    setFresh(Date.now() - data.at < 4000);
    const t = setTimeout(() => setFresh(false), 4000);
    return () => clearTimeout(t);
  }, [data.at]);

  return (
    <div
      onDoubleClick={() => {
        setDraft(data.label);
        setEditing(true);
      }}
      className={`relative w-[200px] rounded-xl border-2 ${s.bg} ${selected ? "border-black dark:border-white shadow-lg" : s.ring} px-3 py-2 shadow-sm transition-all ${fresh && data.by === "agent" ? "animate-[pop_0.6s_ease-out] ring-4 ring-violet-300/60" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-neutral-500" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-neutral-500" />
      <div className="flex items-center gap-2">
        <span className={`text-lg leading-none ${s.text}`}>{s.icon}</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draft.trim() && draft !== data.label) updateNode(id, { label: draft.trim() }, "human");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="nodrag w-full rounded border border-neutral-400 bg-white px-1 text-sm dark:bg-black"
          />
        ) : (
          <div className="truncate text-sm font-semibold">{data.label}</div>
        )}
      </div>
      {data.description && <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-neutral-600 dark:text-neutral-300">{data.description}</div>}
      <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-neutral-400">
        <span>{data.kind}</span>
        <span className={data.by === "agent" ? "text-violet-500" : ""}>{data.by === "agent" ? "🤖 agent" : "✋ you"}</span>
      </div>
    </div>
  );
}
