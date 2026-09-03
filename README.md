# Chalkline

**A diagram canvas that humans and AI agents draw on together.**

Describe a system in plain language and an agent draws it as an architecture diagram. Drag boxes, rename them, draw your own arrows, delete what you don't like, and the agent keeps up, because it reads the live canvas through WebMCP before every change.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

## Why WebMCP

Diagramming tools are famously hostile to agents: the state lives in an SVG or canvas, and there is no DOM an agent can reliably click. Chalkline exposes the diagram as ten structured tools instead, so any WebMCP-capable agent (ChatGPT's browser, Chrome with WebMCP enabled, or the built-in Gemini co-author) can read and edit exactly the same model the human is manipulating on screen.

| Tool | What it does |
| --- | --- |
| `get_diagram` | Read every node and edge, including who added them |
| `add_node` | Add a service, database, queue, cache, user, external system, storage or note |
| `update_node` | Rename, re-type or re-describe a node |
| `remove_node` | Delete a node and its edges |
| `connect` / `disconnect` | Draw or remove a labelled directed edge |
| `auto_layout` | Layered layout (dagre), left-to-right or top-to-bottom |
| `highlight_nodes` | Select nodes so the human sees what the agent is talking about |
| `clear_diagram` | Start over |
| `export_mermaid` | Return the diagram as Mermaid source |

Every tool is registered with the browser with `document.modelContext.registerTool` (see `lib/webmcp.ts`) and unregistered with an `AbortSignal` when the canvas unmounts. Nodes added by the agent pulse in and carry an "agent" badge; nodes you touch are badged "you".

## How to try it

1. Open the live URL in **ChatGPT's in-app browser** or in **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` enabled. Chrome DevTools → Application → WebMCP lists the ten tools and lets you run them by hand.
2. Or use the built-in co-author panel on the right, which is a Gemini agent that discovers the same tools and dispatches through WebMCP. Try: *"Draw a food delivery app architecture"*, then drag things around and ask *"Add a Redis cache between the API and the database"*.

## Run locally

```bash
pnpm install
echo "GEMINI_API_KEY=your_key" > .env.local   # only needed for the in-page co-author
pnpm dev
```

The WebMCP tools work without any key. The in-page agent needs a Gemini API key on the server (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, default `gemini-3.6-flash`).

## Stack

Next.js 16 (App Router) · React Flow · dagre · Tailwind 4 · Gemini function calling · WebMCP (`document.modelContext`)

## License

MIT
