import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

const PAID = new Set(["active", "trialing"]);

export type Access = {
  user: { id: string; email: string | null } | null;
  status: string;            // Stripe status, or "none"
  periodEnd: string | null;
  customerId: string | null;
  paid: boolean;
};

/** Who is visiting and whether their subscription currently unlocks the data. */
export async function getAccess(): Promise<Access> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, status: "none", periodEnd: null, customerId: null, paid: false };
  const { data } = await supabaseAdmin()
    .from("subscriptions")
    .select("status, current_period_end, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const status = data?.status ?? "none";
  return {
    user: { id: user.id, email: user.email ?? null },
    status,
    periodEnd: data?.current_period_end ?? null,
    customerId: data?.stripe_customer_id ?? null,
    paid: PAID.has(status),
  };
}
