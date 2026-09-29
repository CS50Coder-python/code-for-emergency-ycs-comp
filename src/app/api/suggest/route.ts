import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`, { headers: { "User-Agent": process.env.NWS_USER_AGENT ?? "Hearth/1.0 (student project)" }, next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const rows = await res.json();
    return NextResponse.json({ suggestions: rows.map((r: { display_name: string }) => r.display_name) });
  } catch { return NextResponse.json({ suggestions: [] }); }
}
