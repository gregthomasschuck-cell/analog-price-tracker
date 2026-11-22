import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Analog Price Tracker" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  return (
    <main className="narrow">
      <h1>Sign in</h1>
      <p className="muted">No password needed. We&apos;ll email you a link.</p>
      {sp.error && <p className="error">That sign-in link expired or was already used. Request a new one.</p>}
      <LoginForm next={next} />
    </main>
  );
}
