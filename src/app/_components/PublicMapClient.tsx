"use client";
import { useEffect, useRef, useState } from "react";

export interface PublicAssociation {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  fiscalCode: string;
  latitude: number | null;
  longitude: number | null;
  presidentName: string | null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address}, Sector 1, Bucharest, Romania`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ro`;
    const res = await fetch(url, { headers: { "User-Agent": "BlocUAT-Platform/1.0" } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

export default function PublicMapClient({ associations }: { associations: PublicAssociation[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [selected, setSelected] = useState<PublicAssociation | null>(null);
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [search, setSearch] = useState("");

  // Initialize coords from DB-cached values
  useEffect(() => {
    const initial: Record<string, { lat: number; lng: number }> = {};
    associations.forEach(a => {
      if (a.latitude && a.longitude) initial[a.id] = { lat: a.latitude, lng: a.longitude };
    });
    setCoords(initial);
  }, [associations]);

  // Geocode any that are missing
  useEffect(() => {
    const without = associations.filter(a => !a.latitude && !a.longitude);
    if (!without.length) return;
    setGeocoding(true);
    async function run() {
      for (const a of without) {
        await new Promise(r => setTimeout(r, 1100));
        const c = await geocodeAddress(a.address);
        if (c) setCoords(prev => ({ ...prev, [a.id]: c }));
      }
      setGeocoding(false);
    }
    run();
  }, [associations]);

  // Load Leaflet from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(link); } catch { /* already removed */ }
      try { document.head.removeChild(script); } catch { /* already removed */ }
    };
  }, []);

  // Initialize map instance
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as unknown as { L: typeof import("leaflet") }).L;
    const map = L.map(mapRef.current, { center: [44.461, 26.093], zoom: 13 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletLoaded]);

  // Update markers on filter/coord change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    const L = (window as unknown as { L: typeof import("leaflet") }).L;
    const map = mapInstanceRef.current as ReturnType<typeof L.map>;
    markersRef.current.forEach((m: unknown) => (m as ReturnType<typeof L.marker>).remove());
    markersRef.current = [];

    const filtered = search
      ? associations.filter(a =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.address.toLowerCase().includes(search.toLowerCase()) ||
          (a.fiscalCode ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : associations;

    filtered.forEach(a => {
      const c = coords[a.id];
      if (!c) return;
      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 32 40">
          <filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/></filter>
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="#2438e9" filter="url(#ds)"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
        </svg>`,
        className: "",
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
      });
      const marker = L.marker([c.lat, c.lng], { icon })
        .addTo(map)
        .on("click", () => setSelected(a));
      marker.bindTooltip(a.name, { permanent: false, direction: "top" });
      markersRef.current.push(marker);
    });
  }, [leafletLoaded, coords, associations, search]);

  const filteredList = search
    ? associations.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.address.toLowerCase().includes(search.toLowerCase()) ||
        (a.fiscalCode ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : associations;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, address or CUI…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500 focus:border-transparent"
          />
        </div>

        {geocoding && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <svg className="animate-spin w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Locating addresses on map…
          </div>
        )}

        {/* Selected card */}
        {selected && (
          <div className="bg-white border-2 border-uat-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="font-semibold text-slate-900 text-sm leading-tight pr-2">{selected.name}</p>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Address</p>
                <p className="text-slate-700">{selected.address}</p>
              </div>
              {selected.fiscalCode && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">CUI / Fiscal Code</p>
                  <p className="text-slate-700 font-mono font-medium">{selected.fiscalCode}</p>
                </div>
              )}
              {selected.presidentName && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Board President</p>
                  <p className="text-slate-700">{selected.presidentName}</p>
                </div>
              )}
              {selected.neighborhood && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Neighborhood</p>
                  <p className="text-slate-500">{selected.neighborhood}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Association list */}
        {!selected && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No results found.</p>
            ) : filteredList.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelected(a);
                  const c = coords[a.id];
                  if (c && mapInstanceRef.current) {
                    const L = (window as unknown as { L: typeof import("leaflet") }).L;
                    (mapInstanceRef.current as ReturnType<typeof L.map>).setView([c.lat, c.lng], 16);
                  }
                }}
                className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-uat-300 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-slate-900 text-sm truncate">{a.name}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{a.address}</p>
                {a.fiscalCode && (
                  <p className="text-xs text-slate-300 font-mono mt-0.5">CUI: {a.fiscalCode}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-uat-600 hover:underline"
          >
            ← Back to list
          </button>
        )}
      </div>

      {/* Map */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" style={{ height: "540px" }}>
          {!leafletLoaded && (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <svg className="animate-spin w-8 h-8 text-uat-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <p className="text-sm text-slate-500">Loading map…</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ display: leafletLoaded ? "block" : "none" }} />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-right">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">OpenStreetMap</a>
          {" "}&middot;{" "}
          <a href="https://carto.com/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">CARTO</a>
        </p>
      </div>
    </div>
  );
}
