import { MonthlyReport } from "@/components/shared/monthly-report";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ period?: string; consultant?: string }> }) {
  const { user } = await requireRole("admin");
  return <MonthlyReport role="admin" searchParams={searchParams} userId={user.id} />;
}
