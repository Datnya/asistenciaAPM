"use client";

import { useState } from "react";
import { saveRate } from "./actions";

type ClientRate = { id: string; name: string; rate: number };

export function RateCard({ clients, initialClient }: { clients: ClientRate[]; initialClient?: string }) {
  const [id, setId] = useState(initialClient ?? clients[0]?.id ?? "");
  const client = clients.find(item => item.id === id);
  if (!client) return null;

  return <section className="rounded-xl border bg-white p-5">
    <h2 className="mb-3 text-lg font-bold">Tarifa por hora</h2>
    <form action={saveRate} className="flex flex-wrap items-end gap-3">
      <label>Cliente<select className="admin-field mt-1" name="client" value={id} onChange={event => setId(event.target.value)}>
        {clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Soles por hora<input key={client.id} className="admin-field mt-1" type="number" name="rate" min=".01" step=".01" defaultValue={client.rate} required /></label>
      <button className="rounded-lg bg-[#b0bf12] px-4 py-2 font-semibold">Guardar tarifa</button>
    </form>
  </section>;
}
