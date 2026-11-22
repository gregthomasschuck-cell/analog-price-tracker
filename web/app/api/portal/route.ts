import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { stripe, siteUrl } from "@/lib/stripe";

// "Manage billing": Stripe's hosted portal (update card, cancel, invoices).
export async function POST() {
  const a = await getAccess();
  if (!a.user) return NextResponse.redirect(`${siteUrl()}/login?next=/account`, 303);
  if (!a.customerId) return NextResponse.redirect(`${siteUrl()}/account`, 303);
  const s = await stripe.billingPortal.sessions.create({ customer: a.customerId, return_url: `${siteUrl()}/account` });
  return NextResponse.redirect(s.url, 303);
}
