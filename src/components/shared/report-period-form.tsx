"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createReportPeriod, updateReportPeriod } from "@/app/report-period-actions";
import { nextReportDay } from "@/lib/reports/period";

type Period = { id: string; start_date: string; end_date: string };

export function ReportPeriodForm({ role, consultantId, latestEnd, selectedPeriod, today }: { role: "admin" | "consultant"; consultantId: string; latestEnd: string | null; selectedPeriod: Period | null; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextStart = latestEnd ? nextReportDay(latestEnd) : today;
  const [from, setFrom] = useState(nextStart);
  const [to, setTo] = useState(nextStart);

  function openCreate() { setFrom(nextStart); setTo(nextStart); setError(null); setMode("create"); }
  function openEdit() { if (!selectedPeriod) return; setFrom(selectedPeriod.start_date); setTo(selectedPeriod.end_date); setError(null); setMode("edit"); }

  function submit() {
    if (from > to) { setError("La fecha de fin debe ser igual o posterior al inicio."); return; }
    const data = new FormData();
    data.set("from", from); data.set("to", to);
    if (mode === "create") data.set("consultantId", consultantId);
    if (mode === "edit" && selectedPeriod) data.set("periodId", selectedPeriod.id);
    startTransition(async () => {
      try {
        const result = mode === "create" ? await createReportPeriod(data) : await updateReportPeriod(data);
        if (!result.success) { setError(result.error); return; }
        setMode(null); setError(null);
        if (mode === "create" && result.periodId) {
          router.push(`/${role}/monthly-report?${new URLSearchParams({ consultant: consultantId, period: result.periodId })}`);
        }
        router.refresh();
      } catch { setError("No fue posible guardar el período. Reinténtalo."); }
    });
  }

  return <div className="mt-5 flex flex-wrap gap-3">
    <button className="min-h-11 rounded-xl bg-[#b0bf12] px-5 font-semibold text-black" onClick={openCreate} type="button">{latestEnd ? "Crear siguiente período" : "Definir primer período"}</button>
    {role === "admin" && selectedPeriod ? <button className="min-h-11 rounded-xl border border-[#cfd6df] px-5 font-semibold text-[#344056]" onClick={openEdit} type="button">Editar fechas del período</button> : null}
    {mode ? <div aria-labelledby="period-dialog-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="text-2xl font-bold" id="period-dialog-title">{mode === "create" ? "Definir período del reporte" : "Corregir período del reporte"}</h2>
        <p className="mt-2 text-sm text-[#697186]">{mode === "create" && latestEnd ? "El nuevo período empieza el día posterior al cierre anterior; elige cuándo finalizará." : "Estas fechas determinan las jornadas incluidas y el nombre del Excel."}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Fecha de inicio<input className="admin-field mt-2" readOnly={mode === "create" && !!latestEnd} required type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="text-sm font-semibold">Fecha de fin<input className="admin-field mt-2" min={from} required type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
        {mode === "edit" ? <p className="mt-3 text-xs text-[#697186]">Si corriges el cierre, el inicio del período siguiente se ajustará al día posterior. Un período que ya tiene uno anterior debe comenzar justo después de él.</p> : null}
        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-xl border border-[#cfd6df] px-5 font-semibold" disabled={pending} onClick={() => setMode(null)} type="button">Cancelar</button>
          <button className="min-h-11 rounded-xl bg-[#b0bf12] px-5 font-semibold text-black disabled:opacity-60" disabled={pending || !from || !to || from > to} onClick={submit} type="button">{pending ? "Guardando…" : "Guardar período"}</button>
        </div>
      </section>
    </div> : null}
  </div>;
}
