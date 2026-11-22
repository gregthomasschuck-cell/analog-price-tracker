import { NextResponse } from "next/server";
import { getAccess } from "./access";
import { supabaseAdmin } from "./supabase/admin";

const TYPES: Record<string, string> = {
  "dashboard.html": "text/html; charset=utf-8",
  "tracker.xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "observations.csv": "text/csv; charset=utf-8",
};

/** Stream a file from the private "paid" bucket, but only to an active subscriber. */
export async function servePaid(name: string, request: Request) {
  if (!TYPES[name]) return new Response("Not found", { status: 404 });
  const a = await getAccess();
  const origin = new URL(request.url).origin;
  if (!a.user) return NextResponse.redirect(`${origin}/login?next=/dashboard`);
  if (!a.paid) return NextResponse.redirect(`${origin}/account`);

  const { data, error } = await supabaseAdmin().storage.from("paid").download(name);
  if (error || !data) return new Response("The dashboard hasn't been published yet. Try again after the next daily pull.", { status: 503 });
  const headers: Record<string, string> = {
    "Content-Type": TYPES[name],
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  if (name !== "dashboard.html") headers["Content-Disposition"] = `attachment; filename="analog-${name}"`;
  return new Response(data.stream(), { headers });
}
