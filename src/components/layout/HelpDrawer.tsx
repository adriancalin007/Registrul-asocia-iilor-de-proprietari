"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { HELP_ENTRIES } from "@/config/help";

export default function HelpDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const entry = HELP_ENTRIES.find(e => e.match(pathname));

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ajutor"
        className="p-2 rounded-xl text-slate-400 hover:text-uat-600 hover:bg-uat-50 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 h-full w-[400px] max-w-full bg-white shadow-2xl z-50
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "translate-x-full"}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-uat-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm">Ajutor</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {entry ? (
            <div className="px-6 py-5 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">{entry.content.pageTitle}</h2>
                {entry.content.intro && (
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{entry.content.intro}</p>
                )}
              </div>

              {entry.content.sections.map((section, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-uat-400 flex-shrink-0" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                      {section.title}
                    </h3>
                  </div>
                  <div className="pl-3 space-y-1.5 text-sm text-slate-600 leading-relaxed">
                    {section.body.split("\n").map((line, j) => {
                      if (!line.trim()) return null;
                      if (line.startsWith("- ")) {
                        return (
                          <div key={j} className="flex gap-2">
                            <span className="text-uat-400 flex-shrink-0 mt-0.5">•</span>
                            <span>{line.slice(2)}</span>
                          </div>
                        );
                      }
                      return <p key={j}>{line}</p>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Nu există ajutor pentru această pagină.</p>
              <p className="text-xs text-slate-400 mt-1">Navigați la o altă secțiune pentru a vedea informații contextuale.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">
            Portal Asociații de Proprietari · Sector 1 București
          </p>
        </div>
      </div>
    </>
  );
}
