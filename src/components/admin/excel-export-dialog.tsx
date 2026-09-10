"use client";

import { useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";

export function ExcelExportDialog({ consultantId, compact = false }: { consultantId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const valid = Boolean(from && to && from <= to);
  const href = valid ? `/api/admin/consultants/${consultantId}/attendance-export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : undefined;
  return <>
    <button className={`flex items-center justify-center gap-4 rounded-[14px] bg-[linear-gradient(135deg,#9dbb00_0%,#b3ca00_55%,#91ad00_100%)] px-7 font-semibold text-white shadow-[0_12px_28px_rgba(154,177,0,0.18)] ${compact ? "min-h-14 text-base" : "min-h-[68px] text-lg xl:min-w-[420px]"}`} onClick={() => setOpen(true)} type="button"><FileSpreadsheet aria-hidden="true" className="size-7" /> Descargar asistencias en Excel</button>
    {open ? <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog"><section className="relative w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl sm:p-8"><button aria-label="Cerrar" className="absolute top-4 right-4 grid size-10 place-items-center rounded-lg text-[#697186] hover:bg-slate-100" onClick={() => setOpen(false)} type="button"><X /></button><h2 className="pr-10 text-2xl font-bold tracking-[-0.03em]">Descargar asistencias en Excel</h2><p className="mt-2 text-sm leading-6 text-[#697186]">Selecciona el rango de fechas que incluirá el reporte del consultor.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Desde<input className="admin-field mt-2" max={to || undefined} onChange={(event) => setFrom(event.target.value)} type="date" value={from} /></label><label className="block text-sm font-semibold">Hasta<input className="admin-field mt-2" min={from || undefined} onChange={(event) => setTo(event.target.value)} type="date" value={to} /></label></div>{from && to && !valid ? <p className="mt-3 text-sm text-red-700">La fecha final debe ser igual o posterior a la fecha inicial.</p> : null}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={() => setOpen(false)} type="button">Cancelar</button>{href ? <a className="flex min-h-11 items-center justify-center rounded-xl bg-[#a9c000] px-5 font-semibold text-white" href={href} onClick={() => setOpen(false)}>Descargar Excel</a> : <button className="min-h-11 rounded-xl bg-[#d5d9c0] px-5 font-semibold text-white" disabled type="button">Descargar Excel</button>}</div></section></div> : null}
  </>;
}
