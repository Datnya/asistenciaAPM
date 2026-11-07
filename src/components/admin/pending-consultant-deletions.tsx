"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { retryConsultantDeletion } from "@/app/(admin)/admin/consultants/actions";

export function PendingConsultantDeletions({ jobs }: { jobs: Array<{ id: string; username: string }> }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!jobs.length) return null;

  async function retry(jobId: string) {
    setBusyId(jobId); setError(null);
    try {
      const result = await retryConsultantDeletion(jobId);
      if (!result.success) { setError(result.error); return; }
      router.refresh();
    } catch { setError("No fue posible completar la limpieza. Reinténtalo."); }
    finally { setBusyId(null); }
  }

  return <section className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5">
    <h2 className="text-lg font-bold text-amber-950">Limpieza de consultores pendiente</h2>
    <p className="mt-1 text-sm text-amber-900">Los registros de estos consultores ya fueron retirados. Reintenta eliminar sus archivos y credenciales.</p>
    {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    <div className="mt-4 flex flex-wrap gap-3">{jobs.map((job) => <button className="min-h-11 rounded-xl border border-amber-500 bg-white px-4 font-semibold text-amber-950 disabled:opacity-60" disabled={busyId !== null} key={job.id} onClick={() => retry(job.id)} type="button">{busyId === job.id ? "Limpiando…" : `Reintentar ${job.username}`}</button>)}</div>
  </section>;
}
