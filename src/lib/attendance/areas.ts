export const ATTENDANCE_AREAS = [
  { code: "management", label: "Gerencia" },
  { code: "quality", label: "Calidad" },
  { code: "operations", label: "Operaciones" },
  { code: "human_resources", label: "Recursos Humanos" },
  { code: "sst", label: "SST" },
  { code: "logistics", label: "Logística" },
  { code: "administration", label: "Administración" },
  { code: "finance", label: "Finanzas" },
  { code: "commercial", label: "Comercial" },
  { code: "production", label: "Producción" },
  { code: "other", label: "Otro" },
] as const;

export type AttendanceAreaCode = (typeof ATTENDANCE_AREAS)[number]["code"];

export function getAttendanceAreaLabel(code: string) {
  return ATTENDANCE_AREAS.find((area) => area.code === code)?.label ?? code;
}
