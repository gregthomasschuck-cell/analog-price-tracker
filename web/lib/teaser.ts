export type Teaser = {
  generated: string; is_sample: boolean; latest_date: string; dates: string[]; index: (number | null)[];
  kpis: { index: number | null; d1: number | null; w1: number | null; m1: number | null; since: number | null;
    n_up: number; n_down: number; n_priced: number; lead: number | null; lead_d30: number | null;
    instock: number; instock_d30: number | null };
  n_parts: number; n_vendors: number; n_categories: number; distributors: string[];
  trends: string[];
  sample: { mpn: string; vendor: string; category: string; dk: number | null; mo: number | null; w1: number | null; m1: number | null }[];
};

/** teaser.json from the public bucket, written daily by `python tracker.py publish`. */
export async function getTeaser(): Promise<Teaser | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/storage/v1/object/public/public/teaser.json`, { next: { revalidate: 900 } });
    return r.ok ? ((await r.json()) as Teaser) : null;
  } catch {
    return null;
  }
}
