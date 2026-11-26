"use client";
import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { editInvoice } from "./actions";

export function EditInvoice({period, number, issued}: {period:string; number:string; issued:string}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return <span className="inline-flex items-center gap-1">{number}
    <button type="button" aria-label={`Editar factura ${number}`} className="rounded-lg p-3 hover:bg-slate-100" onClick={() => {
      dialog.current?.querySelector("form")?.reset();
      setError("");
      dialog.current?.showModal();
    }}><Pencil size={18}/></button>
    <dialog ref={dialog} aria-labelledby={period} className="m-auto w-96 max-w-full rounded-xl p-6 shadow-xl backdrop:bg-black/40">
      <h2 className="mb-4 text-xl font-bold" id={period}>Editar factura</h2>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setSaving(true);
        try {
          const message = await editInvoice(form);
          setError(message);
          if (!message) dialog.current?.close();
        } catch { setError("No se pudo guardar. Revisa la conexión e inténtalo de nuevo."); }
        finally { setSaving(false); }
      }}>
        <input type="hidden" name="period" value={period}/><input type="hidden" name="previousNumber" value={number}/><input type="hidden" name="previousIssued" value={issued}/>
        <label className="block">Número de factura<input className="admin-field" name="number" defaultValue={number} maxLength={80} required/></label>
        <label className="block">Fecha de emisión<input className="admin-field" name="issued" type="date" defaultValue={issued} required/></label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => dialog.current?.close()}>Cancelar</button>
        <button disabled={saving} className="rounded-lg bg-[#b0bf12] px-4 py-2 font-semibold">{saving ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>
    </dialog>
  </span>;
}
