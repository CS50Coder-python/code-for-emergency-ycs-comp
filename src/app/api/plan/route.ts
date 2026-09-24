import { NextRequest, NextResponse } from "next/server";
import { composePlan } from "@/lib/plan";
import { hasLlm } from "@/lib/env";
import type { HouseholdProfile, HuddlePlay, NwsAlert, WeatherNow } from "@/lib/types";

const TIMEOUT_MS = 20000;

type PlanBody = {
  household: HouseholdProfile;
  play: HuddlePlay;
  weather: WeatherNow;
  alerts: NwsAlert[];
};

/**
 * Household play text. The rules engine always answers. When an OpenAI or
 * Anthropic key is present the model rewrites the play in the household's
 * own terms; any failure or refusal falls back to the rules text.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as PlanBody | null;
  if (!body?.household?.members || !body.play?.rally) {
    return NextResponse.json({ error: "household and play are required" }, { status: 400 });
  }
  body.alerts = Array.isArray(body.alerts) ? body.alerts : [];

  let modelText: string | undefined;
  if (hasLlm()) {
    try {
      modelText = await generate(body);
    } catch {
      modelText = undefined;
    }
  }

  return NextResponse.json({
    source: modelText ? "llm" : "rules",
    plan: composePlan({ ...body, modelText }),
  });
}

function promptFor(body: PlanBody) {
  const rules = composePlan({ ...body });
  return `You are Rally, a wildfire huddle coach. Rewrite the play below as a 180-word household plan. Imperative voice, name every person, keep every number and the rally point exactly. Explain who drives, who gets picked up in what order, and who is stranded if anyone is. No preamble, no markdown headings.

PLAY
${rules}

ROSTER
${JSON.stringify(
  body.household.members.map((m) => ({
    name: m.name,
    role: m.role,
    status: m.status,
    needs: m.needs,
    mobilityMinutes: m.mobilityMinutes,
  })),
)}`;
}

async function generate(body: PlanBody): Promise<string | undefined> {
  const prompt = promptFor(body);

  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : undefined;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  if (data.stop_reason === "refusal") return undefined;
  const text = (data.content ?? []).find(
    (b: { type: string; text?: string }) => b.type === "text",
  )?.text;
  return typeof text === "string" && text.trim() ? text.trim() : undefined;
}
