export const APP_ROLES = ["admin", "consultant"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ATTENDANCE_RECORD_MODES = ["live", "historical"] as const;
export type AttendanceRecordMode = (typeof ATTENDANCE_RECORD_MODES)[number];

export const ATTENDANCE_STATUSES = ["open", "closed", "voided"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
