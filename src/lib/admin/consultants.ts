import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AssignmentRow = {
  consultant_user_id: string;
  clients: { id: string; name: string; is_active: boolean } | null;
};

export type ConsultantRecord = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dni: string | null;
  phoneNumber: string | null;
  avatarPath: string | null;
  isActive: boolean;
  clients: Array<{ id: string; name: string; isActive: boolean }>;
};

export type ConsultantAttendanceRecord = {
  id: string;
  workDate: string;
  workType: "remote" | "onsite" | null;
  clientName: string;
  entryTime: string;
  exitTime: string | null;
  declaredMinutes: number | null;
  status: string;
};

function mapConsultant(
  profile: {
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    dni: string | null;
    phone_number: string | null;
    avatar_path: string | null;
    is_active: boolean;
  },
  assignments: AssignmentRow[],
): ConsultantRecord {
  return {
    userId: profile.user_id,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    fullName: `${profile.first_name} ${profile.last_name}`.trim(),
    dni: profile.dni,
    phoneNumber: profile.phone_number,
    avatarPath: profile.avatar_path,
    isActive: profile.is_active,
    clients: assignments
      .filter((assignment) => assignment.consultant_user_id === profile.user_id && assignment.clients)
      .map((assignment) => ({
        id: assignment.clients!.id,
        name: assignment.clients!.name,
        isActive: assignment.clients!.is_active,
      })),
  };
}

export async function listConsultants(): Promise<ConsultantRecord[]> {
  const admin = createAdminSupabaseClient();
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("user_id, username, first_name, last_name, dni, phone_number, avatar_path, is_active")
    .eq("role", "consultant")
    .order("last_name");

  if (profilesError) throw new Error("No fue posible cargar los consultores.");
  if (!profiles?.length) return [];

  const { data: assignments, error: assignmentsError } = await admin
    .from("consultant_client_assignments")
    .select("consultant_user_id, clients(id, name, is_active)")
    .eq("is_active", true)
    .in("consultant_user_id", profiles.map((profile) => profile.user_id));

  if (assignmentsError) throw new Error("No fue posible cargar las asignaciones.");
  return profiles.map((profile) => mapConsultant(profile, (assignments ?? []) as unknown as AssignmentRow[]));
}

export async function getConsultant(userId: string): Promise<ConsultantRecord | null> {
  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id, username, first_name, last_name, dni, phone_number, avatar_path, is_active")
    .eq("user_id", userId)
    .eq("role", "consultant")
    .maybeSingle();

  if (profileError) throw new Error("No fue posible cargar el consultor.");
  if (!profile) return null;

  const { data: assignments, error: assignmentsError } = await admin
    .from("consultant_client_assignments")
    .select("consultant_user_id, clients(id, name, is_active)")
    .eq("consultant_user_id", userId)
    .eq("is_active", true);

  if (assignmentsError) throw new Error("No fue posible cargar las asignaciones.");
  return mapConsultant(profile, (assignments ?? []) as unknown as AssignmentRow[]);
}

export async function listActiveClientNames(): Promise<string[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("clients")
    .select("name")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error("No fue posible cargar los clientes.");
  return (data ?? []).map((client) => client.name);
}

export async function listConsultantAttendance(userId: string): Promise<ConsultantAttendanceRecord[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("attendance_sessions")
    .select("id, work_date, work_type, entry_time, exit_time, declared_minutes, status, clients(name)")
    .eq("consultant_user_id", userId)
    .neq("status", "voided")
    .order("work_date", { ascending: false });
  if (error) throw new Error("No fue posible cargar las asistencias del consultor.");
  return (data ?? []).map((session) => ({
    id: session.id,
    workDate: session.work_date,
    workType: session.work_type as "remote" | "onsite" | null,
    clientName: (session.clients as unknown as { name: string } | null)?.name ?? "-",
    entryTime: session.entry_time,
    exitTime: session.exit_time,
    declaredMinutes: session.declared_minutes,
    status: session.status,
  }));
}
