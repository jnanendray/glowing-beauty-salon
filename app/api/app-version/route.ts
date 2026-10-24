import { NextResponse } from "next/server";

/**
 * Latest published Android app version, read from the repo's GitHub
 * Releases (tags look like "android-1.0.12"; the last number is the
 * build number Android uses to decide what's newer). Cached for 15
 * minutes so we stay far inside GitHub's free API limits.
 */

const REPO = "jnanendray/glowing-beauty-salon";

type Release = {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
};

export const revalidate = 900;

export async function GET() {
  const none = NextResponse.json({ available: false });
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "glowing-beauty-salon" },
      next: { revalidate: 900 },
    });
    if (!res.ok) return none;

    const release = (await res.json()) as Release;
    const match = /^android-(\d+)\.(\d+)\.(\d+)$/.exec(release.tag_name);
    const apk = release.assets.find((a) => a.name.endsWith(".apk"));
    if (!match || !apk) return none;

    return NextResponse.json(
      {
        available: true,
        versionCode: Number(match[3]),
        versionName: `${match[1]}.${match[2]}.${match[3]}`,
        apkUrl: apk.browser_download_url,
        releaseUrl: release.html_url,
      },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } }
    );
  } catch {
    return none;
  }
}
