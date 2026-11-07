import { MonthlyReport } from "@/components/shared/monthly-report";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { user } = await requireRole("consultant");
  return <MonthlyReport role="consultant" searchParams={searchParams} userId={user.id} />;
}
