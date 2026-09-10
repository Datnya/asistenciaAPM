import { z } from "zod";

import { ATTENDANCE_AREAS } from "./areas";
import { declaredHoursToMinutes, isBusinessTime } from "./hours";

const businessTimeSchema = z.string().refine(isBusinessTime, "Ingresa una hora válida.");

export const startAttendanceSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente asignado."),
  entryTime: businessTimeSchema,
});

export const attendanceActivitySchema = z.object({
  sessionId: z.string().uuid(),
  areaCode: z.enum(ATTENDANCE_AREAS.map((area) => area.code) as [string, ...string[]]),
  otherAreaName: z.string().trim().max(120, "El área específica no puede superar 120 caracteres.").optional(),
  description: z.string().trim().min(1, "Indica el motivo o concepto de la reunión.").max(250, "El motivo no puede superar 250 caracteres."),
}).superRefine((value, context) => {
  if (value.areaCode === "other" && !value.otherAreaName) {
    context.addIssue({ code: "custom", path: ["otherAreaName"], message: "Indica el área específica." });
  }
});

export const closeAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  exitTime: businessTimeSchema,
  declaredHours: z.string().refine(
    (value) => {
      const minutes = declaredHoursToMinutes(value);
      return minutes !== null && minutes > 0 && minutes <= 1440;
    },
    "Declara las horas en formato HH:MM, entre 00:01 y 24:00.",
  ),
});

export const profilePhoneSchema = z.string().trim().regex(/^9\d{8}$/, "El celular debe tener 9 dígitos y empezar por 9.");
