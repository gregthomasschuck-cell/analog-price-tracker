import Link from "next/link";
import { getTeaser, type Teaser } from "@/lib/teaser";
import { getAccess } from "@/lib/access";
import { stripe } from "@/lib/stripe";

const pct = (x: number | null | undefined, d = 1) =>
  x == null ? "–" : Math.abs(x) < 0.0005 ? "0.0%" : `${x > 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const cls = (x: number | null | undefined) => (x == null || Math.abs(x) < 0.0005 ? "" : x > 0 ? "up" : "down");
const usd = (x: number | null) => (x == null ? "–" : `$${x < 1 ? x.toFixed(4) : x.toFixed(2)}`);

async function monthlyPrice(): Promise<string | null> {
  try {
    const p = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
    if (p.unit_amount == null) return null;
    const amt = (p.unit_amount / 100).toLocaleString("en-US", { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: p.unit_amount % 100 ? 2 : 0 });
    return amt;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [t, a, price] = await Promise.all([getTeaser(), getAccess().catch(() => null), monthlyPrice()]);

  return (
    <main>
      <h1>Analog chip pricing, tracked every day</h1>
      <p className="lede">
        A fixed basket of {t?.n_parts ?? "hundreds of"} analog semiconductor SKUs, priced daily at{" "}
        {t?.distributors.join(" and ") ?? "major distributors"}: list price at the 1k break, stock and quoted lead times,
        rolled into basket, vendor and category indices.
      </p>

      {t ? <Preview t={t} /> : <p className="note">The free preview appears after the first daily publish.</p>}

      <h2 id="subscribe">Full access</h2>
      <div className="paywall card">
        <div>
          <p><b>Subscribers get:</b></p>
          <ul>
            <li>Every SKU with daily price, stock and lead time, 1D / 1W / 1M changes and sparklines</li>
            <li>Price indices by vendor and by product category{t ? ` (${t.n_vendors} vendors, ${t.n_categories} categories)` : ""}</li>
            <li>The day&apos;s biggest movers and auto-written trend notes</li>
            <li>Excel workbook and full raw CSV history, refreshed daily</li>
          </ul>
        </div>
        <div className="stack">
          {price && <div className="price">{price}<small> / month</small></div>}
          <p className="muted">Cancel any time from your account.</p>
          {a?.paid ? (
            <Link className="btn" href="/dashboard">Open the dashboard</Link>
          ) : a?.user ? (
            <form action="/api/checkout" method="post"><button className="btn">Subscribe</button></form>
          ) : (
            <Link className="btn" href="/login?next=/account">Sign up to subscribe</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Preview({ t }: { t: Teaser }) {
  const k = t.kpis;
  return (
    <>
      {t.is_sample && <p className="note">Sample data shown until live prices are published.</p>}
      <div className="kpis">
        <div className="kpi"><div className="label">Basket index</div><div className="value">{k.index?.toFixed(1) ?? "–"}</div><div className="sub">start = 100</div></div>
        <div className="kpi"><div className="label">1 week</div><div className={`value ${cls(k.w1)}`}>{pct(k.w1)}</div></div>
        <div className="kpi"><div className="label">1 month</div><div className={`value ${cls(k.m1)}`}>{pct(k.m1)}</div></div>
        <div className="kpi"><div className="label">In stock</div><div className="value">{Math.round(k.instock * 100)}%</div>
          <div className="sub">{k.instock_d30 != null ? `${k.instock_d30 >= 0 ? "+" : ""}${Math.round(k.instock_d30 * 100)} pts vs 30d` : ""}</div></div>
        <div className="kpi"><div className="label">Avg lead time</div><div className="value">{k.lead?.toFixed(1) ?? "–"} wk</div>
          <div className="sub">{k.lead_d30 != null ? `${k.lead_d30 >= 0 ? "+" : ""}${k.lead_d30.toFixed(1)} wk vs 30d` : ""}</div></div>
      </div>

      <h2>Basket price index</h2>
      <IndexChart dates={t.dates} values={t.index} />
      <p className="muted">Through {t.latest_date}. Chained geometric mean of day-over-day price relatives.</p>

      {t.trends.length > 0 && (<><h2>Latest read</h2><ul className="trends">{t.trends.map((x) => <li key={x}>{x}</li>)}</ul></>)}

      <h2>Sample SKUs</h2>
      <div className="tablewrap">
        <table>
          <thead><tr><th>MPN</th><th>Vendor</th><th>Category</th><th className="num">1k price</th><th className="num">1W</th><th className="num">1M</th></tr></thead>
          <tbody>
            {t.sample.map((p) => (
              <tr key={p.mpn}><td>{p.mpn}</td><td>{p.vendor}</td><td>{p.category}</td><td className="num">{usd(p.dk ?? p.mo)}</td>
                <td className={`num ${cls(p.w1)}`}>{pct(p.w1)}</td><td className={`num ${cls(p.m1)}`}>{pct(p.m1)}</td></tr>
            ))}
            {[0, 1, 2].map((i) => (
              <tr key={`l${i}`} className="locked" aria-hidden><td>XXXXXXXXXX</td><td>XXX</td><td>XXXXXXXXXXXX</td><td className="num">$0.0000</td><td className="num">+0.0%</td><td className="num">+0.0%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted"><a href="#subscribe">Subscribe</a> to see all {t.n_parts} SKUs.</p>
    </>
  );
}

function IndexChart({ dates, values }: { dates: string[]; values: (number | null)[] }) {
  const W = 1000, H = 260, P = { l: 44, r: 12, t: 12, b: 28 };
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return <p className="muted">The chart appears after two days of data.</p>;
  let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const pad = Math.max((hi - lo) * 0.15, 0.5); lo -= pad; hi += pad;
  const x = (i: number) => P.l + (i / (values.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const d = pts.map(([i, v], n) => `${n ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Basket price index over time">
      {ticks.map((v) => (
        <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{v.toFixed(1)}</text></g>
      ))}
      <text x={P.l} y={H - 8} fontSize="12" fill="var(--muted)">{dates[0]}</text>
      <text x={W - P.r} y={H - 8} fontSize="12" fill="var(--muted)" textAnchor="end">{dates[dates.length - 1]}</text>
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
