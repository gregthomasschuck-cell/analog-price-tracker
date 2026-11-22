import { redirect } from "next/navigation";
import Link from "next/link";
import { getAccess } from "@/lib/access";

export const metadata = { title: "Account · Analog Price Tracker" };
export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const sp = await searchParams;
  const a = await getAccess();
  if (!a.user) redirect("/login?next=/account");
  const end = a.periodEnd ? new Date(a.periodEnd).toLocaleDateString("en-US", { dateStyle: "medium" }) : null;

  return (
    <main className="narrow">
      <h1>Your account</h1>
      <p className="muted">Signed in as {a.user.email}</p>

      {sp.checkout === "success" && !a.paid && (
        <p className="note">Payment received. Your access is being activated; refresh in a few seconds.</p>
      )}

      {a.paid ? (
        <div className="card stack">
          <p><b>Subscription active.</b>{end && <> Renews {end}.</>}</p>
          <Link className="btn" href="/dashboard">Open the full dashboard</Link>
          <form action="/api/portal" method="post"><button className="btn ghost">Manage billing</button></form>
        </div>
      ) : (
        <div className="card stack">
          <p>{a.status === "none" ? "You don't have a subscription yet." : `Your subscription is ${a.status.replace("_", " ")}.`}</p>
          <p className="muted">Subscribe for every SKU, vendor and category index, daily history and Excel/CSV downloads.</p>
          <form action="/api/checkout" method="post"><button className="btn">Subscribe</button></form>
          {a.customerId && <form action="/api/portal" method="post"><button className="btn ghost">Manage billing</button></form>}
        </div>
      )}

      <form action="/auth/signout" method="post"><button className="link">Sign out</button></form>
    </main>
  );
}
