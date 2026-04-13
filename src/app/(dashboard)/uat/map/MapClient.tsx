"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Association {
  id: string; name: string; address: string; neighborhood: string;
  status: string; latitude: number | null; longitude: number | null;
  openIssues: number; activeConsultations: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", PENDING: "#f59e0b", UNDER_REVIEW: "#3b82f6",
  NEEDS_COMPLETION: "#f97316", REJECTED: "#6b7280", INACTIVE: "#6b7280", SUSPENDED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active", PENDING: "Pending", UNDER_REVIEW: "Under Review",
  NEEDS_COMPLETION: "Needs Completion", REJECTED: "Rejected", INACTIVE: "Inactive", SUSPENDED: "Suspended",
};

const FILTERS = [
  { label: "All", value: null },
  { label: "Active", value: "ACTIVE" },
  { label: "In process", value: "PENDING" },
  { label: "With open issues", value: "__ISSUES__" },
];

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address}, Sector 1, Bucharest, Romania`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ro`;
    const res = await fetch(url, { headers: { "User-Agent": "BlocUAT-Platform/1.0" } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { }
  return null;
}

export default function MapClient({ associations }: { associations: Association[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Association | null>(null);
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [geocoding, setGeocoding] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    const initial: Record<string, { lat: number; lng: number }> = {};
    associations.forEach(a => { if (a.latitude && a.longitude) initial[a.id] = { lat: a.latitude, lng: a.longitude }; });
    setCoords(initial);
  }, [associations]);

  useEffect(() => {
    const without = associations.filter(a => !a.latitude && !a.longitude);
    if (!without.length) return;
    setGeocoding(true);
    async function run() {
      for (const a of without) {
        await new Promise(r => setTimeout(r, 1100));
        const c = await geocodeAddress(a.address);
        if (c) {
          setCoords(prev => ({ ...prev, [a.id]: c }));
          fetch(`/api/uat/associations/${a.id}/geocode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).catch(() => {});
        }
      }
      setGeocoding(false);
    }
    run();
  }, [associations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(link); document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as unknown as { L: typeof import("leaflet") }).L;
    const map = L.map(mapRef.current, { center: [44.461, 26.093], zoom: 13, zoomControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    const L = (window as unknown as { L: typeof import("leaflet") }).L;
    const map = mapInstanceRef.current as ReturnType<typeof L.map>;
    markersRef.current.forEach((m: unknown) => (m as ReturnType<typeof L.marker>).remove());
    markersRef.current = [];

    const filtered = associations.filter(a => {
      if (!coords[a.id]) return false;
      if (!filter) return true;
      if (filter === "__ISSUES__") return a.openIssues > 0;
      if (filter === "PENDING") return ["PENDING","UNDER_REVIEW","NEEDS_COMPLETION"].includes(a.status);
      return a.status === filter;
    });

    filtered.forEach(a => {
      const c = coords[a.id];
      if (!c) return;
      const color = STATUS_COLORS[a.status] ?? "#6b7280";
      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter>
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="${color}" filter="url(#s)"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
          ${a.openIssues > 0 ? `<circle cx="24" cy="8" r="6" fill="#ef4444"/><text x="24" y="12" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${a.openIssues}</text>` : ""}
        </svg>`,
        className: "", iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40],
      });
      const marker = L.marker([c.lat, c.lng], { icon }).addTo(map).on("click", () => setSelected(a));
      marker.bindTooltip(a.name, { permanent: false, direction: "top" });
      markersRef.current.push(marker);
    });
  }, [leafletLoaded, coords, associations, filter]);

  const geocodedCount = associations.filter(a => coords[a.id]).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <div className="card card-body">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Filter</p>
          <div className="space-y-1">
            {FILTERS.map(f => (
              <button key={f.label} type="button" onClick={() => setFilter(f.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.value ? "bg-uat-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {geocoding && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Geocoding addresses...
            </div>
          )}
        </div>

        <div className="card card-body">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Legend</p>
          <div className="space-y-2">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-600">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="card card-body border-uat-200">
            <div className="flex items-start justify-between mb-3">
              <p className="font-semibold text-slate-900 text-sm leading-tight">{selected.name}</p>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-300 hover:text-slate-500 ml-2 flex-shrink-0">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-3">{selected.address}</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] }} />
              <span className="text-xs font-medium text-slate-700">{STATUS_LABELS[selected.status]}</span>
            </div>
            {selected.openIssues > 0 && <p className="text-xs text-red-600 mb-3">⚠ {selected.openIssues} open issues</p>}
            <Link href={`/uat/associations/${selected.id}`} className="btn-primary w-full text-xs py-2 justify-center">
              Open file →
            </Link>
          </div>
        )}

        <div className="card card-body text-center">
          <p className="text-2xl font-bold text-slate-900">{geocodedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">located on map</p>
          <p className="text-xs text-slate-300 mt-1">of {associations.length} total</p>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="card overflow-hidden" style={{ height: "580px" }}>
          {!leafletLoaded && (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <svg className="animate-spin w-8 h-8 text-uat-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <p className="text-sm text-slate-500">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ display: leafletLoaded ? "block" : "none" }} />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-right">
          Maps © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">OpenStreetMap</a> contributors · <a href="https://carto.com/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">CARTO</a>
        </p>
      </div>
    </div>
  );
}
