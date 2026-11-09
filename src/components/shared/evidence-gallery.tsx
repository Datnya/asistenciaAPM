"use client";

import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { clampEvidencePan } from "@/lib/ui/evidence-pan";

export function EvidenceGallery({ sessionId, count, variant = "tiles" }: { sessionId: string; count: number; variant?: "tiles" | "buttons" }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const indices = Array.from({ length: Math.min(2, count) }, (_, index) => index);

  useEffect(() => {
    if (selected === null) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  function open(index: number) { setSelected(index); setZoom(1); setPan({ x: 0, y: 0 }); setImageSize({ width: 0, height: 0 }); setLoadError(false); }
  function clamp(x: number, y: number, nextZoom = zoom) {
    const rect = stageRef.current?.getBoundingClientRect();
    return clampEvidencePan({ width: rect?.width ?? 0, height: rect?.height ?? 0 }, imageSize, nextZoom, x, y);
  }
  function changeZoom(delta: number) {
    const next = Math.max(1, Math.min(4, zoom + delta));
    setZoom(next);
    setPan(clamp(pan.x, pan.y, next));
  }
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
      <div className={`relative my-3 min-h-0 flex-1 overflow-hidden rounded-xl bg-black ${zoom > 1 ? dragging ? "cursor-grabbing" : "cursor-grab" : ""}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => {
        if (zoom <= 1 || loadError) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        lastPoint.current = { x: event.clientX, y: event.clientY };
        setDragging(true);
      }} onPointerMove={(event) => {
        if (!lastPoint.current) return;
        const deltaX = event.clientX - lastPoint.current.x;
        const deltaY = event.clientY - lastPoint.current.y;
        lastPoint.current = { x: event.clientX, y: event.clientY };
        setPan((current) => clamp(current.x + deltaX, current.y + deltaY));
      }} onPointerUp={(event) => {
        lastPoint.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }} onPointerCancel={() => { lastPoint.current = null; setDragging(false); }} ref={stageRef} style={{ touchAction: "none" }}>
        {loadError ? <p className="absolute inset-0 grid place-items-center text-center">No se pudo cargar la imagen.</p> : <Image alt={`Evidencia ${selected + 1} ampliada`} className="pointer-events-none select-none object-contain" draggable={false} fill onError={() => setLoadError(true)} onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} sizes="100vw" src={src(selected)} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} unoptimized />}
      </div>
      <div className="flex items-center justify-center gap-3" onClick={(event) => event.stopPropagation()}>
        <button aria-label="Alejar imagen" className="grid size-11 place-items-center rounded-lg border border-white/40 disabled:opacity-40" disabled={zoom <= 1} onClick={() => changeZoom(-0.25)} type="button"><ZoomOut /></button>
        <span className="min-w-14 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button aria-label="Acercar imagen" className="grid size-11 place-items-center rounded-lg border border-white/40 disabled:opacity-40" disabled={zoom >= 4} onClick={() => changeZoom(0.25)} type="button"><ZoomIn /></button>
        <button aria-label="Restablecer zoom" className="grid size-11 place-items-center rounded-lg border border-white/40" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} type="button"><RotateCcw /></button>
      </div>
    </div> : null}
  </>;
}
