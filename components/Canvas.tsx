"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import DiagramNode from "@/components/DiagramNode";
import * as D from "@/lib/diagram";

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

function FitOnChange({ version }: { version: number }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 600, padding: 0.15, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
  }, [version, rf]);
  return null;
}

function CanvasInner() {
  const state = useSyncExternalStore(D.subscribe, D.getState, D.getState);
  const nodeTypes = useMemo(() => ({ box: DiagramNode }), []);

  useEffect(() => {
    D.hydrate();
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<D.DNode>[]) => {
    D.setNodes(applyNodeChanges(changes, D.getState().nodes));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange<D.DEdge>[]) => {
    D.setEdges(applyEdgeChanges(changes, D.getState().edges));
  }, []);
  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) D.connect(c.source, c.target, undefined, "human");
  }, []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={state.nodes}
        edges={state.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        className="bg-[#fafaf7] dark:bg-[#0f0f10]"
      >
        <FitOnChange version={state.fitVersion} />
        <Background gap={24} size={1.2} />
        <Controls position="bottom-left" />
        <MiniMap pannable zoomable position="bottom-right" className="!bg-white/80 dark:!bg-black/60" />
      </ReactFlow>
      {state.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm rounded-2xl border border-dashed border-neutral-300 bg-white/70 p-6 text-center text-sm text-neutral-500 backdrop-blur dark:border-neutral-700 dark:bg-black/40">
            <div className="mb-1 text-2xl">✏️ + 🤖</div>
            Describe a system to the agent on the right, or drop nodes yourself with the toolbar.
            <br />
            <span className="text-xs">Drag to move · drag handles to connect · double-click to rename · Delete to remove</span>
          </div>
        </div>
      )}
    </div>
  );
}
