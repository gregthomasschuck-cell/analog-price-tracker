import "./globals.css";
import Link from "next/link";
import { getAccess } from "@/lib/access";

export const metadata = {
  title: "Analog Price Tracker",
  description: "Daily distributor pricing, stock and lead times for a fixed basket of analog semiconductors.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const a = await getAccess().catch(() => null);
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">Analog Price Tracker</Link>
          <nav>
            {a?.paid && <Link href="/dashboard">Dashboard</Link>}
            {a?.user ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>}
          </nav>
        </header>
        {children}
        <footer className="foot muted">Distributor list prices at the 1,000-unit break. Directional channel signal, not contract pricing.</footer>
      </body>
    </html>
  );
}
