"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setState("error"); setMsg(error.message); } else setState("sent");
  }

  if (state === "sent")
    return <p className="note">Check <b>{email}</b> for a sign-in link. You can close this tab.</p>;

  return (
    <form onSubmit={submit} className="stack">
      <label htmlFor="email">Work email</label>
      <input id="email" type="email" required autoComplete="email" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      <button className="btn" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state === "error" && <p className="error">{msg}</p>}
    </form>
  );
}
