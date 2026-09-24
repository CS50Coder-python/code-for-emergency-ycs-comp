import { NextRequest, NextResponse } from "next/server";
import { hasTwilio } from "@/lib/env";

const E164 = /^\+[1-9]\d{6,14}$/;
const MAX_BODY = 320;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

/** GO / AT RALLY / NEED RIDE pulses. Twilio when keyed, otherwise a simulated receipt. */
export async function POST(req: NextRequest) {
  const parsed = (await req.json().catch(() => null)) as { to?: unknown; body?: unknown } | null;
  const to = typeof parsed?.to === "string" ? parsed.to.trim() : "";
  const body = typeof parsed?.body === "string" ? parsed.body.trim().slice(0, MAX_BODY) : "";
  if (!E164.test(to) || !body) {
    return NextResponse.json(
      { error: "to must be E.164 (+15551234567) and body is required" },
      { status: 400 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(ip)) {
    return NextResponse.json({ error: "Too many pulses. Wait a minute." }, { status: 429 });
  }

  if (!hasTwilio()) {
    return NextResponse.json({ status: "simulated", id: `sim-${Date.now()}`, to, body });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({
        status: "simulated",
        id: `sim-${Date.now()}`,
        to,
        body,
        twilio: data?.message ?? "rejected",
      });
    }
    return NextResponse.json({ status: "sent", id: data.sid, to, body });
  } catch {
    return NextResponse.json({ status: "simulated", id: `sim-${Date.now()}`, to, body });
  }
}

function allow(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length <= MAX_PER_WINDOW;
}
