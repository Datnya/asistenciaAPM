"use client";

import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function EvidenceGallery({ sessionId, count, variant = "tiles" }: { sessionId: string; count: number; variant?: "tiles" | "buttons" }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const indices = Array.from({ length: Math.min(2, count) }, (_, index) => index);

  useEffect(() => {
    if (selected === null) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  function open(index: number) { setSelected(index); setZoom(1); setLoadError(false); }
  const src = (index: number) => `/api/attendance/evidence/${sessionId}/${index}`;
  if (!indices.length) return null;

  return <>
    <div className={variant === "tiles" ? "mt-4 grid gap-4 sm:grid-cols-2" : "mt-3 flex flex-wrap gap-2"}>
      {indices.map((index) => variant === "tiles" ? <button className="group rounded-xl border border-[#d7dce4] bg-[#f8f9fb] p-3 text-left focus-visible:outline-2 focus-visible:outline-[#92a300]" key={index} onClick={() => open(index)} type="button">
        <span className="text-sm font-semibold text-[#344056]">Evidencia {index + 1}</span>
        <span className="relative mt-2 block h-44 overflow-hidden rounded-lg bg-white sm:h-52"><Image alt={`Evidencia ${index + 1} de la jornada`} className="object-contain transition-transform group-hover:scale-[1.03]" fill sizes="(max-width: 640px) 100vw, 320px" src={src(index)} unoptimized /></span>
        <span className="mt-2 block text-xs text-[#697186]">Toca la imagen para ampliarla</span>
      </button> : <button className="min-h-11 rounded-lg border border-[#d7dce4] px-3 py-2 text-sm font-semibold text-[#52617a] hover:bg-[#f4f7e9]" key={index} onClick={() => open(index)} type="button">Ver evidencia {index + 1}</button>)}
    </div>
    {selected !== null ? <div aria-label={`Evidencia ${selected + 1}`} aria-modal="true" className="fixed inset-0 z-[80] flex flex-col bg-black/90 p-3 text-white sm:p-5" onClick={() => setSelected(null)} role="dialog">
      <div className="flex items-center justify-between gap-3" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold">Evidencia {selected + 1}</h2>
        <button aria-label="Cerrar imagen" className="grid size-11 place-items-center rounded-lg hover:bg-white/15" onClick={() => setSelected(null)} type="button"><X /></button>
      </div>
      <div className="relative my-3 min-h-0 flex-1 overflow-hidden rounded-xl bg-black" onClick={(event) => event.stopPropagation()}>
        {loadError ? <p className="absolute inset-0 grid place-items-center text-center">No se pudo cargar la imagen.</p> : <Image alt={`Evidencia ${selected + 1} ampliada`} className="object-contain transition-transform duration-150" fill onError={() => setLoadError(true)} sizes="100vw" src={src(selected)} style={{ transform: `scale(${zoom})` }} unoptimized />}
      </div>
      <div className="flex items-center justify-center gap-3" onClick={(event) => event.stopPropagation()}>
        <button aria-label="Alejar imagen" className="grid size-11 place-items-center rounded-lg border border-white/40 disabled:opacity-40" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.25))} type="button"><ZoomOut /></button>
        <span className="min-w-14 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button aria-label="Acercar imagen" className="grid size-11 place-items-center rounded-lg border border-white/40 disabled:opacity-40" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value + 0.25))} type="button"><ZoomIn /></button>
        <button aria-label="Restablecer zoom" className="grid size-11 place-items-center rounded-lg border border-white/40" onClick={() => setZoom(1)} type="button"><RotateCcw /></button>
      </div>
    </div> : null}
  </>;
}
