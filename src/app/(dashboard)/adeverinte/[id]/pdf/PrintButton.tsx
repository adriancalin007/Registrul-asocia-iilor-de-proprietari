"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      🖨 Printează / Salvează PDF
    </button>
  );
}
