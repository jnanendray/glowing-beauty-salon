"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Who is looking at the page — shared by every component that needs it.
 *
 * Before, each "Book" button, the header and the chat bubble each asked
 * Supabase "who's signed in?" and "are they an admin?" on their own —
 * about 20 network calls on the homepage for a signed-in visitor. Now
 * it's worked out once per page load (and again only when someone
 * signs in or out), and every component reads the same answer.
 *
 * This only drives what the UI shows. The server and database still
 * check permissions themselves on every real action.
 */

export type ViewerUser = {
  id: string;
  email: string | null;
  metadata: Record<string, unknown>;
};

export type Viewer =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: ViewerUser; isAdmin: boolean };

const LOADING: Viewer = { status: "loading" };
const SIGNED_OUT: Viewer = { status: "signed-out" };

let current: Viewer = LOADING;
let started = false;
let resolveRun = 0;
const listeners = new Set<() => void>();

function set(next: Viewer) {
  current = next;
  listeners.forEach((l) => l());
}

async function resolve(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const run = ++resolveRun;
  if (!user) {
    set(SIGNED_OUT);
    return;
  }
  const supabase = createClient();
  const { data } = await supabase.rpc("is_admin");
  if (run !== resolveRun) return; // a newer sign-in/out happened meanwhile
  set({
    status: "signed-in",
    user: { id: user.id, email: user.email ?? null, metadata: user.user_metadata ?? {} },
    isAdmin: data === true,
  });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const supabase = createClient();
  // getSession() reads the stored session locally — no network call.
  supabase.auth.getSession().then(({ data }) => resolve(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      // Same user re-confirmed (e.g. tab refocus) — nothing to redo.
      if (
        event === "SIGNED_IN" &&
        current.status === "signed-in" &&
        session?.user?.id === current.user.id
      ) {
        return;
      }
      resolve(session?.user ?? null);
    }
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useViewer(): Viewer {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => LOADING
  );
}

/** Short friendly name for the header: first name, else the email's username. */
export function viewerFirstName(user: ViewerUser): string {
  const name = user.metadata.full_name ?? user.metadata.name;
  if (typeof name === "string" && name.trim()) return name.trim().split(" ")[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
}
