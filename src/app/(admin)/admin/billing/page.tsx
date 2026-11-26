import { EditInvoice } from "./edit-invoice";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";

import { RateCard } from "./rate-card";
import { InvoiceEntry } from "./invoice-entry";

function formatBillingDate(date: string) { return date.split("-").reverse().join("/"); }
const money = new Intl.NumberFormat("es-PE", {style:"currency",currency:"PEN"});
const soles = (cents: number) => money.format(cents / 100);
const field = "admin-field mt-1";
const button = "rounded-lg bg-[#b0bf12] px-4 py-2 font-semibold text-black";
export default async function Billing({searchParams}: {searchParams: Promise<{client?:string; consultant?:string}>}) {
  await requireRole("admin");
  const filters = await searchParams;
  const db = createAdminSupabaseClient();
  const [clients, consultants, rates] = await Promise.all([
    db.from("clients").select("id,name").order("name"),
    db.from("profiles").select("user_id,username,first_name,last_name").eq("role","consultant").order("first_name"),
    db.from("billing_rates").select("client_id,rate")
  ]);
  if (clients.error || consultants.error || rates.error) throw new Error("No se pudo cargar la configuración de facturación.");
  let query = db.from("billing_overview").select("*").order("start_date",{ascending:false}).order("id");
  if (filters.client) query=query.eq("client_id",filters.client);
  if (filters.consultant) query=query.eq("consultant_user_id",filters.consultant);
  const {data,error}=await query;
  if(error) throw new Error("No se pudo cargar la facturación.");
  const rows=data.map(row=>{
    const base=Math.round(row.minutes * Math.round(row.rate*100)/60);
    const tax=Math.round(base*18/100);
    return {...row,base,tax,total:base+tax};
  });
  const client=clients.data.find(c=>c.id===filters.client);
  const shortNames = new Map<string,string>(consultants.data.map(c => {
    const names = c.first_name.trim().split(/\s+/);
    const surnames = c.last_name.trim().split(/\s+/);
    const normalize = (word: string) => word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    // Older profiles store only the last word in last_name.
    const usernameSurname = c.username.split(".")[1];
    const embeddedSurname = [...names.slice(1), ...surnames].find((word: string) => normalize(word) === usernameSurname);
    const surname = surnames.length > 1 ? surnames[0] : embeddedSurname ?? (names.length > 1 ? names.at(-1) : surnames[0]);
    return [c.user_id, [names[0], surname].join(" ")];
  }));
  const groups = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const group = groups.get(row.client_id);
    if (group) group.push(row); else groups.set(row.client_id, [row]);
  };
  const billed=rows.filter(r=>r.number);
  return <main className="space-y-6 p-5 lg:p-9">
    <h1 className="text-3xl font-bold">Facturación por períodos</h1>
    <form className="flex flex-wrap items-end gap-3">
      <label>Cliente<select name="client" className={field} defaultValue={filters.client}><option value="">Todos los clientes</option>{clients.data.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Consultor<select name="consultant" className={field} defaultValue={filters.consultant}><option value="">Todos los consultores</option>{consultants.data.map(c=><option key={c.user_id} value={c.user_id}>{shortNames.get(c.user_id)}</option>)}</select></label>
      <button className={button}>Aplicar filtros</button>
    </form>
    <RateCard key={client?.id ?? "all"} initialClient={client?.id} clients={clients.data.map(c => ({id:c.id, name:c.name, rate:rates.data.find(r=>r.client_id===c.id)?.rate ?? 89}))} />
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Períodos",rows.length],["Horas registradas",formatDeclaredMinutes(rows.reduce((s,r)=>s+r.minutes,0))],
      ["Facturado con IGV",soles(billed.reduce((s,r)=>s+r.total,0))],
      ["Total facturado sin IGV",soles(billed.reduce((s,r)=>s+r.base,0))]
    ].map(([label,value])=><div className="rounded-xl border bg-white p-4" key={label}><dt>{label}</dt><dd className="text-xl font-bold">{value}</dd></div>)}</dl>
    {Array.from(groups, ([id, group]) => <section key={id ?? "unassigned"}><h2 className="mb-4 text-3xl font-bold">{group[0].client ?? "Cliente por revisar"}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Consultor","Inicio","Fin","Fecha de emisión","Horas","Subtotal","IGV (18 %)","Total","Factura"].map(h=><th className={h === "Fecha de emisión" ? "bg-[#b0bf12] p-2 text-black" : "p-2"} key={h}>{h}</th>)}</tr></thead>
    <tbody>{group.map(r=><tr className="border-t" key={r.id}><td className="p-2">{shortNames.get(r.consultant_user_id)}</td><td>{formatBillingDate(r.start_date)}</td><td>{formatBillingDate(r.end_date)}</td><td className="bg-[#b0bf12]/25 p-2 font-semibold">{r.issued?formatBillingDate(r.issued):"Pendiente"}</td>
    <td>{formatDeclaredMinutes(r.minutes)}</td>{[r.base,r.tax,r.total].map((v,i)=><td className="whitespace-nowrap p-2" key={i}>{r.client_id?soles(v):"—"}</td>)}
    <td>{r.number ? <EditInvoice period={r.id} number={r.number} issued={r.issued}/> : (r.client_id && r.minutes>0 ? <InvoiceEntry>
      <input type="hidden" name="period" value={r.id}/><input type="hidden" name="client" value={r.client_id}/><input type="hidden" name="rate" value={r.rate}/><input type="hidden" name="minutes" value={r.minutes}/>
      </InvoiceEntry>:r.client_count>1?"Jornadas de varios clientes":"Sin horas facturables")}</td>
</tr>)}</tbody></table></div></section>)}
    {!rows.length && <p className="p-4">No hay períodos para esta selección.</p>}
  </main>;
}
