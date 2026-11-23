import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportPeriodLabel } from "@/lib/reports/period";

export async function getHistoryPeriods(userId: string) {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from("report_periods").select("id,start_date,end_date")
    .eq("consultant_user_id", userId).order("start_date", { ascending: false });
  if (error) throw error;
  return data;
}

export function HistoryPeriodFilter({ periods, selected }: {
  periods: Awaited<ReturnType<typeof getHistoryPeriods>>;
  selected?: string;
}) {
  return <label className="text-sm font-semibold">Período
    <select className="consultant-field mt-1" name="period" defaultValue={selected ?? ""}>
      <option value="">Usar día, mes o año</option>
      {periods.map(period => <option key={period.id} value={period.id}>
        {reportPeriodLabel(period.start_date, period.end_date)}
      </option>)}
    </select>
  </label>;
}
