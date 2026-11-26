"use client";
import { useState, type ReactNode } from "react";
import { getLimaWorkDate } from "@/lib/attendance/lima";
import { recordInvoice } from "./actions";

export function InvoiceEntry({ children }: { children: ReactNode }) {
  const [issued, setIssued] = useState("");
  return <details onToggle={event => {
    if (event.currentTarget.open) setIssued(getLimaWorkDate());
  }}>
    <summary className="cursor-pointer">Registrar factura</summary>
    <form action={recordInvoice} className="space-y-2 p-2">
      {children}
      <label>Número<input className="admin-field mt-1" name="number" required maxLength={80}/></label>
      <label>Fecha de emisión<input className="admin-field mt-1" type="date" name="issued" value={issued} onChange={event => setIssued(event.target.value)} required /></label>
      <button className="rounded-lg bg-[#b0bf12] px-4 py-2 font-semibold">Registrar</button>
    </form>
  </details>;
}
