import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Thin proxy to Gemini for the in-page agent panel.
 * The client keeps the full conversation (`contents`) in Gemini's native format and
 * sends the current WebMCP tool declarations with every turn. The model's reply is
 * returned verbatim so function calls (and thought signatures) round-trip intact.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const body = (await req.json()) as {
    contents: unknown[];
    tools: { name: string; description: string; parametersJsonSchema: unknown }[];
    system: string;
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: body.system }] },
        contents: body.contents,
        tools: body.tools.length ? [{ functionDeclarations: body.tools }] : undefined,
        generationConfig: { temperature: 0.3 },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Gemini error ${res.status}: ${text.slice(0, 500)}` }, { status: 502 });
  }
  const data = (await res.json()) as {
    candidates?: { content?: { role: string; parts: unknown[] } }[];
  };
  const content = data.candidates?.[0]?.content;
  if (!content) return NextResponse.json({ error: "No response from model." }, { status: 502 });
  return NextResponse.json({ content });
}
