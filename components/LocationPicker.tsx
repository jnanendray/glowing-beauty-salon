"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Free map pin for at-home bookings — no API key, no billing.
 *  • Map: Leaflet + OpenStreetMap tiles (loaded from a CDN on demand,
 *    only when someone picks "At your home").
 *  • "Use my location": the phone/browser's own GPS.
 *  • Address search + auto-fill: OpenStreetMap's free Nominatim
 *    service, called only when the customer acts (never in a loop).
 * If the map can't load, the typed address still works on its own.
 */

export type Coords = { lat: number; lng: number };

type LatLng = { lat: number; lng: number };
interface LMap {
  setView(center: [number, number], zoom: number): LMap;
  on(event: "click", fn: (e: { latlng: LatLng }) => void): LMap;
  invalidateSize(): void;
  remove(): void;
}
interface LMarker {
  setLatLng(p: [number, number]): LMarker;
  getLatLng(): LatLng;
  on(event: "dragend", fn: () => void): LMarker;
  addTo(map: LMap): LMarker;
}
interface LeafletGlobal {
  map(el: HTMLElement, opts?: { scrollWheelZoom?: boolean }): LMap;
  tileLayer(url: string, opts: { maxZoom: number; attribution: string }): { addTo(map: LMap): void };
  marker(p: [number, number], opts: { draggable: boolean }): LMarker;
}

const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist";
const NOMINATIM = "https://nominatim.openstreetmap.org";
// Roughly the middle of India, zoomed out, until we know where the customer is.
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

let leafletPromise: Promise<LeafletGlobal> | null = null;

function loadLeaflet(): Promise<LeafletGlobal> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise<LeafletGlobal>((resolve, reject) => {
    const w = window as unknown as { L?: LeafletGlobal };
    if (w.L) {
      resolve(w.L);
      return;
    }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${LEAFLET}/leaflet.css`;
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = `${LEAFLET}/leaflet.js`;
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.async = true;
    script.onload = () => {
      const loaded = (window as unknown as { L?: LeafletGlobal }).L;
      if (loaded) resolve(loaded);
      else reject(new Error("Leaflet missing"));
    };
    script.onerror = () => {
      leafletPromise = null; // allow a retry on next mount
      reject(new Error("Leaflet failed to load"));
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

type SearchResult = { display_name: string; lat: string; lon: string };
type ReverseResult = {
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    village?: string;
    town?: string;
    city?: string;
    city_district?: string;
  };
};

async function reverseGeocode(c: Coords): Promise<{ address: string; area: string } | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${c.lat}&lon=${c.lng}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ReverseResult;
    const a = data.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.village || a.town || a.city || "";
    if (!street && !area) return null;
    return { address: street, area };
  } catch {
    return null;
  }
}

export default function LocationPicker({
  value,
  onChange,
  onAddressFound,
}: {
  value: Coords | null;
  onChange: (c: Coords) => void;
  /** Called with a best-guess street/area after the pin moves. */
  onAddressFound: (found: { address: string; area: string }) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const leafletRef = useRef<LeafletGlobal | null>(null);
  const reverseTimer = useRef<number | null>(null);

  // Keep the latest callbacks without re-creating the map.
  const onChangeRef = useRef(onChange);
  const onAddressRef = useRef(onAddressFound);
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressRef.current = onAddressFound;
  }, [onChange, onAddressFound]);

  const [mapState, setMapState] = useState<"loading" | "ready" | "failed">("loading");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const initialValue = useRef(value);

  function placePin(c: Coords, zoom?: number) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (L && map) {
      if (markerRef.current) {
        markerRef.current.setLatLng([c.lat, c.lng]);
      } else {
        const marker = L.marker([c.lat, c.lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          pinMoved({ lat: p.lat, lng: p.lng });
        });
        markerRef.current = marker;
      }
      if (zoom) map.setView([c.lat, c.lng], zoom);
    }
  }

  function pinMoved(c: Coords) {
    const rounded = { lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) };
    onChangeRef.current(rounded);
    // Nominatim allows ~1 request/second — wait for the pin to settle.
    if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
    reverseTimer.current = window.setTimeout(async () => {
      const found = await reverseGeocode(rounded);
      if (found) onAddressRef.current(found);
    }, 900);
  }

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        leafletRef.current = L;
        const start = initialValue.current;
        const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(
          start ? [start.lat, start.lng] : DEFAULT_CENTER,
          start ? 16 : 5
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        map.on("click", (e) => {
          const c = { lat: e.latlng.lat, lng: e.latlng.lng };
          placePin(c);
          pinMoved(c);
        });
        mapRef.current = map;
        if (start) placePin(start);
        setMapState("ready");
        // The map sits in a panel that just appeared — make sure it sizes correctly.
        window.setTimeout(() => map.invalidateSize(), 50);
      })
      .catch(() => {
        if (!cancelled) setMapState("failed");
      });

    return () => {
      cancelled = true;
      if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setMessage("Your browser can't share its location — drop the pin on the map instead.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        placePin(c, 17);
        pinMoved(c);
        setMessage("Pinned your current location — drag the pin if it's slightly off.");
      },
      (err) => {
        setLocating(false);
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow it in your browser, or search / tap the map instead."
            : "Couldn't get your location right now — search or tap the map instead."
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }

  async function search() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(
        `${NOMINATIM}/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = res.ok ? ((await res.json()) as SearchResult[]) : [];
      setResults(data);
      if (data.length === 0) setMessage("No matches — try a nearby landmark or area name.");
    } catch {
      setMessage("Search isn't available right now — tap the map instead.");
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: SearchResult) {
    const c = { lat: Number(r.lat), lng: Number(r.lon) };
    setResults([]);
    setQuery(r.display_name.split(",").slice(0, 2).join(","));
    placePin(c, 17);
    pinMoved(c);
  }

  if (mapState === "failed") {
    return (
      <p className="font-body rounded-2xl bg-white/70 px-4 py-3 text-xs text-[#8a6b61]">
        The map couldn&rsquo;t load on this connection — just type your address and area above.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[#3a241f]/10 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={locateMe}
          disabled={locating || mapState !== "ready"}
          className="font-body flex items-center justify-center gap-2 rounded-full bg-[#3a241f] px-4 py-2.5 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {locating ? "Finding you…" : "Use my location"}
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          className="flex flex-1 gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Or search your area / landmark"
            aria-label="Search for your area"
            className="font-body min-w-0 flex-1 rounded-full border border-[#3a241f]/15 px-4 py-2.5 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
          />
          <button
            type="submit"
            disabled={searching || !query.trim() || mapState !== "ready"}
            className="font-body rounded-full border border-[#3a241f]/15 px-4 py-2.5 text-sm font-semibold text-[#3a241f] disabled:opacity-50"
          >
            {searching ? "…" : "Find"}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-[#3a241f]/10">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                onClick={() => pickResult(r)}
                className="font-body block w-full border-b border-[#3a241f]/5 px-3 py-2 text-left text-xs text-[#3a241f] last:border-0 hover:bg-[#fdf5f1]"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative mt-3 overflow-hidden rounded-xl">
        <div ref={mapEl} className="h-64 w-full bg-[#f1e7e2] sm:h-72" />
        {mapState === "loading" && (
          <p className="font-body absolute inset-0 flex items-center justify-center text-xs text-[#8a6b61]">
            Loading map…
          </p>
        )}
      </div>

      <p className="font-body mt-2 text-xs text-[#8a6b61]">
        {message ??
          (value
            ? "Pin set — drag it or tap the map to adjust."
            : "Tap the map to drop a pin at your door, or use your location. Optional, but it helps us find you.")}
      </p>
    </div>
  );
}
