"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function saveRate(form: FormData) {
  await requireRole("admin");
  const client_id = z.string().uuid().parse(form.get("client"));
  const rate = z.coerce.number().positive().max(99999999.99).multipleOf(0.01).parse(form.get("rate"));
  const { error } = await createAdminSupabaseClient().from("billing_rates").upsert({client_id, rate});
  if (error) throw new Error("No se pudo guardar la tarifa.");
  revalidatePath("/admin/billing");
}
export async function recordInvoice(form: FormData) {
  await requireRole("admin");
  const {error} = await createAdminSupabaseClient().rpc("record_period_invoice", {
    p_id: z.string().uuid().parse(form.get("period")), p_client: z.string().uuid().parse(form.get("client")),
    p_rate: z.coerce.number().positive().parse(form.get("rate")), p_minutes: z.coerce.number().int().positive().parse(form.get("minutes")),
    p_number: z.string().trim().min(1).max(80).parse(form.get("number")), p_issued: z.string().date().parse(form.get("issued"))
  });
  if (error) throw new Error("No se pudo registrar la factura. Actualiza la vista para revisar el período.");
  revalidatePath("/admin/billing");
}

export async function editInvoice(form: FormData) {
  await requireRole("admin");
  const fields = z.object({
    period: z.string().uuid(), number: z.string().trim().min(1).max(80),
    issued: z.string().date(), previousNumber: z.string(), previousIssued: z.string().date()
  }).safeParse(Object.fromEntries(form));
  if (!fields.success) return "Revisa el número y la fecha de emisión.";
  const {period, number, issued, previousNumber, previousIssued} = fields.data;
  const {data, error} = await createAdminSupabaseClient().from("period_invoices")
    .update({number, issued}).eq("period_id", period)
    .eq("number", previousNumber).eq("issued", previousIssued).select("period_id").maybeSingle();
  if (error) return "No se pudo guardar la factura. Inténtalo de nuevo.";
  if (!data) return "La factura cambió. Actualiza la página antes de editarla.";
  revalidatePath("/admin/billing");
  return "";
}
