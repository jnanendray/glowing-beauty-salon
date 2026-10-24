"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext, startDemoSession } from "@/lib/demo";
import { useViewer, viewerFirstName } from "@/lib/viewer";

/**
 * Demo sign-in: name + phone → a 4-digit code shown right on screen →
 * type it in → signed in.
 *
 * Nothing is sent by SMS (that needs a paid service). The code only
 * shows how the real flow would feel. Signing in creates a private
 * Supabase "anonymous" account for this visitor on the same backend,
 * so everything after this — booking, chat — is real and protected by
 * the same database rules as a normal customer.
 */

type Step = "details" | "otp" | "signing-in";

function makeCode(): string {
  const n = new Uint32Array(1);
  window.crypto.getRandomValues(n);
  return String(1000 + (n[0] % 9000));
}

export default function DemoLogin({ next }: { next: string }) {
  const router = useRouter();
  const viewer = useViewer();
  const target = safeNext(next);

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Opening this page puts the tab/app into demo mode.
  useEffect(() => {
    startDemoSession();
  }, []);

  function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please add a 10-digit mobile number.");
      return;
    }
    setCode(makeCode());
    setEntered("");
    setStep("otp");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (entered.trim() !== code) {
      setError("That code doesn't match — check the code shown above.");
      return;
    }
    setStep("signing-in");
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: name.trim(), demo: true } },
    });
    if (signInError) {
      setStep("otp");
      setError(
        /anonymous/i.test(signInError.message)
          ? "Demo sign-in isn't switched on yet (Supabase → Authentication → allow anonymous sign-ins)."
          : signInError.message
      );
      return;
    }

    // Save the name and phone on the demo customer's profile, like a real booking would.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      await supabase
        .from("customers")
        .update({ full_name: name.trim(), phone: phone.trim() })
        .eq("auth_user_id", userId);
    }

    router.replace(target);
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setStep("details");
  }

  if (viewer.status === "signed-in" && step !== "signing-in") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="font-body text-sm text-[#3a241f]">
          You&rsquo;re signed in as <span className="font-semibold">{viewerFirstName(viewer.user)}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            router.replace(target);
          }}
          className="font-body rounded-full bg-[#9d5d48] px-5 py-3 text-sm font-semibold text-[#fdf5f1] hover:bg-[#8a4f3d]"
        >
          Continue
        </button>
        <button type="button" onClick={signOut} className="font-body text-xs font-semibold text-[#806155] underline">
          Sign out and start a new demo
        </button>
      </div>
    );
  }

  if (step === "details") {
    return (
      <form onSubmit={sendCode} className="flex flex-col gap-3">
        <label className="font-body flex flex-col gap-1 text-sm font-medium text-[#5c4038]">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 120))}
            autoComplete="name"
            placeholder="e.g. Priya"
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm font-normal text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
          />
        </label>
        <label className="font-body flex flex-col gap-1 text-sm font-medium text-[#5c4038]">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm font-normal text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
          />
        </label>
        {error && <p className="font-body text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          className="font-body mt-1 rounded-full bg-[#9d5d48] px-5 py-3 text-sm font-semibold text-[#fdf5f1] hover:bg-[#8a4f3d]"
        >
          Send OTP
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <div className="rounded-2xl border border-dashed border-[#9d5d48]/50 bg-[#fdf5f1] px-5 py-4 text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#806155]">Your demo code</p>
        <p className="font-display mt-1 text-4xl font-semibold tracking-[0.35em] text-[#3a241f]" aria-live="polite">
          {code}
        </p>
        <p className="font-body mt-1 text-xs text-[#806155]">
          In the real app this arrives by SMS or WhatsApp. Sent to {phone}.
        </p>
      </div>

      <label className="font-body flex flex-col gap-1 text-sm font-medium text-[#5c4038]">
        Enter the code
        <input
          value={entered}
          onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="4-digit code"
          className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-center text-lg font-semibold tracking-[0.3em] text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
        />
      </label>
      {error && <p className="font-body text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={entered.length !== 4 || step === "signing-in"}
        className="font-body rounded-full bg-[#9d5d48] px-5 py-3 text-sm font-semibold text-[#fdf5f1] hover:bg-[#8a4f3d] disabled:opacity-50"
      >
        {step === "signing-in" ? "Signing in…" : "Verify & sign in"}
      </button>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => {
            setCode(makeCode());
            setEntered("");
            setError(null);
          }}
          className="font-body text-xs font-semibold text-[#806155] underline"
        >
          Resend code
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("details");
            setError(null);
          }}
          className="font-body text-xs font-semibold text-[#806155] underline"
        >
          Change number
        </button>
      </div>
    </form>
  );
}
