import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe, siteUrl } from "@/lib/stripe";

// "Subscribe" button: send the signed-in user to Stripe Checkout.
export async function POST() {
  const a = await getAccess();
  if (!a.user) return NextResponse.redirect(`${siteUrl()}/login?next=/account`, 303);
  if (a.paid) return NextResponse.redirect(`${siteUrl()}/dashboard`, 303);

  let customerId = a.customerId;
  if (!customerId) {
    const c = await stripe.customers.create({ email: a.user.email ?? undefined, metadata: { user_id: a.user.id } });
    customerId = c.id;
    await supabaseAdmin().from("subscriptions").upsert({
      user_id: a.user.id, email: a.user.email, stripe_customer_id: customerId, updated_at: new Date().toISOString(),
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: a.user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { metadata: { user_id: a.user.id } },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/account?checkout=success`,
    cancel_url: `${siteUrl()}/account`,
  });
  return NextResponse.redirect(session.url!, 303);
}
