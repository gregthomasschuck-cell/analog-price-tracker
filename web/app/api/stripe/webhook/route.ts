import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Stripe → us: keeps public.subscriptions in step with each customer's subscription.
// Add this URL in Stripe → Developers → Webhooks, with the events listed in web/README.md.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400 });
  }

  let sub: Stripe.Subscription | null = null;
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.subscription) sub = await stripe.subscriptions.retrieve(String(s.subscription));
  } else if (event.type.startsWith("customer.subscription.")) {
    // re-fetch so out-of-order events can't overwrite newer state
    const s = event.data.object as Stripe.Subscription;
    sub = await stripe.subscriptions.retrieve(s.id);
  }
  if (sub) await save(sub);
  return new Response("ok");
}

async function save(sub: Stripe.Subscription) {
  const db = supabaseAdmin();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId = sub.metadata?.user_id as string | undefined;
  if (!userId) {
    const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error(`No user for Stripe customer ${customerId}`);
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
