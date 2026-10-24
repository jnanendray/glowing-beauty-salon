"use client";

/**
 * "Demo mode" is remembered for the current tab/app session only
 * (sessionStorage). The demo Android app opens /demo, which switches it
 * on; from then on, anything that would send someone to the real
 * sign-in page sends them to the demo sign-in instead.
 *
 * sessionStorage (not localStorage) on purpose: the Android app shares
 * Chrome's storage, so a lasting flag would leak into normal browsing.
 */

const KEY = "gbs_demo";

export function isDemoSession(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function startDemoSession() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode — demo still works for this page */
  }
}

/** Only ever follow a same-site path after sign-in. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}
