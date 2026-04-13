"use client";
// src/components/ui/StreetAutocomplete.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { searchStreets } from "@/lib/streets-sector1";

const STREET_NEIGHBORHOOD: Record<string, string> = {
  "Strada Visarion": "Romană", "Strada Nicolae Iorga": "Romană",
  "Strada Dionisie Lupu": "Romană", "Strada Polona": "Romană",
  "Strada Tache Ionescu": "Romană", "Strada Mendeleev": "Romană",
  "Strada Pictor Verona": "Romană", "Strada Pictor Arthur Verona": "Romană",
  "Bulevardul Dacia": "Dorobanți", "Bulevardul Lascăr Catargiu": "Romană",
  "Bulevardul Magheru": "Romană", "Bulevardul Aviatorilor": "Aviatorilor",
  "Bulevardul Primăverii": "Aviatorilor", "Bulevardul Mărăști": "Aviatorilor",
  "Calea Dorobanților": "Dorobanți", "Calea Floreasca": "Floreasca",
  "Calea Victoriei": "Romană", "Calea Griviței": "Grivița",
  "Șoseaua Kiseleff": "Herăstrău", "Șoseaua Nordului": "Băneasa",
  "Șoseaua Băneasa": "Băneasa", "Șoseaua Floreasca": "Floreasca",
  "Șoseaua Pipera": "Pipera", "Șoseaua București-Ploiești": "Băneasa",
  "Aleea Alexandru": "Aviatorilor", "Aleea Modrogan": "Herăstrău",
  "Strada Herăstrău": "Herăstrău", "Strada Turda": "Grivița",
  "Strada Grivița": "Grivița", "Bulevardul Nicolae Titulescu": "Grivița",
  "Strada Buzești": "Victoriei", "Piața Victoriei": "Victoriei",
  "Piața Romană": "Romană", "Piața Aviatorilor": "Aviatorilor",
  "Strada Barbu Văcărescu": "Floreasca", "Strada Lizeanu": "Floreasca",
  "Strada Florilor": "Floreasca", "Strada Frumoasă": "Dorobanți",
  "Strada Plevnei": "Victoriei", "Strada Știrbei Vodă": "Victoriei",
  "Strada Ion Câmpineanu": "Victoriei", "Strada George Enescu": "Romană",
  "Strada Eminescu": "Dorobanți", "Strada Mihai Eminescu": "Dorobanți",
  "Strada Vasile Lascăr": "Dorobanți", "Strada Toamnei": "Dorobanți",
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onNeighborhoodDetected?: (neighborhood: string) => void;
  placeholder?: string;
  error?: string;
}

export default function StreetAutocomplete({ value, onChange, onNeighborhoodDetected, placeholder, error }: Props) {
  const [streetInput, setStreetInput] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Parse initial value once
  useEffect(() => {
    if (initialized.current || !value) return;
    initialized.current = true;
    const commaIdx = value.indexOf(",");
    if (commaIdx > 0) {
      setStreetInput(value.slice(0, commaIdx).trim());
      setNumberInput(value.slice(commaIdx + 1).trim());
    } else {
      setStreetInput(value);
    }
  }, [value]);

  function buildFullAddress(street: string, number: string) {
    if (street && number) return `${street}, ${number}`;
    return street || number;
  }

  function handleStreetChange(input: string) {
    setStreetInput(input);
    setSelectedFromList(false);
    onChange(buildFullAddress(input, numberInput));

    if (input.length >= 2) {
      const results = searchStreets(input);
      setSuggestions(results);
      setOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function handleNumberChange(input: string) {
    setNumberInput(input);
    onChange(buildFullAddress(streetInput, input));
  }

  function selectSuggestion(street: string) {
    setStreetInput(street);
    setSelectedFromList(true);
    setSuggestions([]);
    setOpen(false);
    onChange(buildFullAddress(street, numberInput));

    const neighborhood = STREET_NEIGHBORHOOD[street];
    if (neighborhood && onNeighborhoodDetected) {
      onNeighborhoodDetected(neighborhood);
    }

    // Focus number input
    setTimeout(() => {
      (wrapperRef.current?.querySelector(".number-input") as HTMLInputElement)?.focus();
    }, 50);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="space-y-2">
      {/* Street input with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={streetInput}
          onChange={e => handleStreetChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder ?? "ex: Strada Nicolae Iorga"}
          autoComplete="off"
          className={`input ${error ? "border-red-400 bg-red-50" : ""}`}
        />

        {/* Suggestions dropdown */}
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
            {suggestions.map(s => (
              <button key={s} type="button" onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-uat-50 hover:text-uat-700 transition-colors flex items-center gap-2.5">
                <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {s}
              </button>
            ))}
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Nomenclator străzi Sector 1 · Tastați liber dacă strada nu apare
            </div>
          </div>
        )}

        {/* Hint when typing but no match */}
        {streetInput.length >= 2 && !open && suggestions.length === 0 && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Strada nu apare în nomenclator — continuați să tastați liber
          </p>
        )}
      </div>

      {/* Number / details */}
      <input
        type="text"
        value={numberInput}
        onChange={e => handleNumberChange(e.target.value)}
        placeholder="Nr., bl., sc., ap. (opțional)"
        className="input number-input text-sm"
      />

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
