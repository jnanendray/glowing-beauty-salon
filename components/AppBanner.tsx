"use client";

import { useEffect, useState } from "react";

/**
 * One slim bar at the very top of the page, for Android only:
 *
 *  • Inside our Android app, if a newer version has been published:
 *    "Update available → Download & install". Installing it replaces
 *    the current app (same app, same signing key, higher version) —
 *    the customer stays signed in.
 *
 *  • In the phone's browser (or a copy Chrome installed from the
 *    website): "Get the app" with a direct download. This replaces
 *    Chrome's own "Install app", which made a second, separate copy.
 *
 * The app tells us its version through its start URL (?app_v=N); older
 * builds that don't do that are recognised by Android's app referrer.
 */

const PACKAGE = "com.glowingbeautysalon.app";
const SS_IN_APP = "gbs_in_app";
const SS_APP_V = "gbs_app_v";
const SS_LATEST = "gbs_latest_app";
const LS_GET_APP_DISMISSED = "gbs_get_app_dismissed_until";
const SS_UPDATE_DISMISSED = "gbs_update_dismissed";

type Latest = {
  available: boolean;
  versionCode?: number;
  versionName?: string;
  apkUrl?: string;
};

type Banner =
  | { kind: "none" }
  | { kind: "update"; latest: Required<Pick<Latest, "versionCode" | "versionName" | "apkUrl">> }
  | { kind: "get-app"; apkUrl: string; browserCopy: boolean };

function safeGet(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function safeSet(store: Storage | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    /* private mode etc. — just don't remember */
  }
}

async function fetchLatest(): Promise<Latest> {
  const cached = safeGet(window.sessionStorage, SS_LATEST);
  if (cached) {
    try {
      return JSON.parse(cached) as Latest;
    } catch {
      /* fall through */
    }
  }
  try {
    const res = await fetch("/api/app-version");
    const data = (await res.json()) as Latest;
    safeSet(window.sessionStorage, SS_LATEST, JSON.stringify(data));
    return data;
  } catch {
    return { available: false };
  }
}

export default function AppBanner() {
  const [banner, setBanner] = useState<Banner>({ kind: "none" });

  useEffect(() => {
    const ss = window.sessionStorage;
    const url = new URL(window.location.href);

    // 1. Are we inside our Android app? Remember it for this session.
    let inApp = safeGet(ss, SS_IN_APP) === "1";
    let appVersion = Number(safeGet(ss, SS_APP_V)) || 0;
    const fromUrl = url.searchParams.get("app_v");
    if (fromUrl && /^\d+$/.test(fromUrl)) {
      inApp = true;
      appVersion = Number(fromUrl);
      safeSet(ss, SS_APP_V, String(appVersion));
      url.searchParams.delete("app_v");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    if (document.referrer.startsWith(`android-app://${PACKAGE}`)) inApp = true;
    if (inApp) safeSet(ss, SS_IN_APP, "1");

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!inApp && !isAndroid) return;

    let cancelled = false;
    fetchLatest().then((latest) => {
      if (cancelled || !latest.available || !latest.apkUrl || !latest.versionCode || !latest.versionName) return;

      if (inApp) {
        // Builds from before update checks report no version → treat as older.
        const dismissed = safeGet(ss, SS_UPDATE_DISMISSED) === String(latest.versionCode);
        if (latest.versionCode > appVersion && !dismissed) {
          setBanner({
            kind: "update",
            latest: { versionCode: latest.versionCode, versionName: latest.versionName, apkUrl: latest.apkUrl },
          });
        }
        return;
      }

      const until = Number(safeGet(window.localStorage, LS_GET_APP_DISMISSED)) || 0;
      if (Date.now() < until) return;
      const browserCopy = window.matchMedia("(display-mode: standalone)").matches;
      setBanner({ kind: "get-app", apkUrl: latest.apkUrl, browserCopy });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (banner.kind === "none") return null;

  function dismiss() {
    if (banner.kind === "update") {
      safeSet(window.sessionStorage, SS_UPDATE_DISMISSED, String(banner.latest.versionCode));
    } else if (banner.kind === "get-app") {
      // Ask again in a week.
      safeSet(window.localStorage, LS_GET_APP_DISMISSED, String(Date.now() + 7 * 86_400_000));
    }
    setBanner({ kind: "none" });
  }

  const isUpdate = banner.kind === "update";
  const href = isUpdate ? banner.latest.apkUrl : banner.apkUrl;

  let text: string;
  if (isUpdate) {
    text = `A new version of the app is ready (${banner.latest.versionName}). Installing it replaces this one — you'll stay signed in.`;
  } else if (banner.browserCopy) {
    text = "This is a browser copy of our site. Get the real app for updates — then you can remove this one.";
  } else {
    text = "Get the Glowing Beauty app for Android.";
  }

  return (
    <div
      role="region"
      aria-label={isUpdate ? "App update" : "Get the app"}
      className={`font-body relative z-50 ${isUpdate ? "bg-[#3a241f] text-[#fdf5f1]" : "bg-[#f1d9cf] text-[#3a241f]"}`}
    >
      <div className="mx-auto flex max-w-[1760px] items-center gap-3 px-4 py-2.5 md:px-10">
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">{text}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            isUpdate ? "bg-[#e3ab93] text-[#3a241f]" : "bg-[#9d5d48] text-[#fdf5f1]"
          }`}
        >
          {isUpdate ? "Update" : "Download"}
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full px-2 py-1 text-sm opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
