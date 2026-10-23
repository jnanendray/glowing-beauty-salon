"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type EmailState = "idle" | "sending" | "sent" | "error";

export default function LoginForm({ next = "/" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<EmailState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next);
    return url.toString();
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser navigates away to Google, so only an
    // immediate error (e.g. provider not enabled yet) lands here.
    if (error) setGoogleLoading(false);
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setErrorMessage(error?.message ?? null);
    setState(error ? "error" : "sent");
  }

  return (
    <div className="w-full max-w-[420px]">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googleLoading}
        className="font-body flex w-full items-center justify-center gap-3 rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm font-semibold text-[#3a241f] transition hover:border-[#3a241f]/30 disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#3a241f]/10" />
        <span className="font-body text-xs font-medium uppercase tracking-wide text-[#8a6b61]">or</span>
        <span className="h-px flex-1 bg-[#3a241f]/10" />
      </div>

      {state === "sent" ? (
        <div className="rounded-2xl border border-[#b8765f]/30 bg-[#fdf5f1] px-5 py-4 text-center">
          <p className="font-body text-sm font-medium text-[#3a241f]">
            Check your inbox — we sent a sign-in link to <span className="font-semibold">{email}</span>.
          </p>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="font-body mt-2 text-xs font-semibold text-[#9a5a46] underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label className="font-body text-sm font-medium text-[#5c4038]" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="font-body rounded-full bg-[#b8765f] px-5 py-3 text-sm font-semibold text-[#fdf5f1] transition hover:bg-[#c48670] disabled:opacity-60"
          >
            {state === "sending" ? "Sending link…" : "Send me a sign-in link"}
          </button>
          {state === "error" && (
            <p className="font-body text-xs text-red-600">
              {errorMessage ?? "Something went wrong sending that link — check the email address and try again."}
            </p>
          )}
          <p className="font-body text-xs text-[#8a6b61]">
            No password needed — we&rsquo;ll email you a secure link to sign in.
          </p>
        </form>
      )}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#3a241f]/10" />
        <span className="font-body text-xs font-medium uppercase tracking-wide text-[#8a6b61]">coming soon</span>
        <span className="h-px flex-1 bg-[#3a241f]/10" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="disabled-option flex items-center gap-3 rounded-full border border-[#3a241f]/15 bg-white px-5 py-3">
          <PhoneIcon />
          <span className="font-body flex-1 text-sm font-medium text-[#3a241f]">Continue with Phone OTP</span>
          <span className="font-body rounded-full bg-[#3a241f]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5c4038]">
            Requires paid SMS service
          </span>
        </div>
        <div className="disabled-option flex items-center gap-3 rounded-full border border-[#3a241f]/15 bg-white px-5 py-3">
          <WhatsAppIcon />
          <span className="font-body flex-1 text-sm font-medium text-[#3a241f]">Continue with WhatsApp OTP</span>
          <span className="font-body rounded-full bg-[#3a241f]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5c4038]">
            Requires paid WhatsApp service
          </span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20.5H24v7.9h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.6-5.6C34.1 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.5 4.8C14.5 15.7 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.6-5.6C34.1 6 29.3 4 24 4c-7.5 0-14 4.1-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.5 26.8 36.4 24 36.4c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.9 39.8 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20.5H24v7.9h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
        stroke="#5c4038"
        strokeWidth="1.5"
      />
      <path d="M11 18h2" stroke="#5c4038" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-3.6-6.7L20 4l-1 3.9A8 8 0 0 1 20 12Z"
        stroke="#5c4038"
        strokeWidth="1.5"
      />
      <path d="M9 10.5c.3 1.8 2.2 3.7 4 4" stroke="#5c4038" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
