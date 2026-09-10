const timePattern = /^([01]\d|2[0-4]):([0-5]\d)$/;

export function normalizeDeclaredHours(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(trimmed);
  if (!match) return trimmed;

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 24 || minutes > 59 || (hours === 24 && minutes !== 0)) {
    return trimmed;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function declaredHoursToMinutes(value: string) {
  const match = timePattern.exec(normalizeDeclaredHours(value));
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 24 && minutes !== 0) return null;
  return hours * 60 + minutes;
}

export function isBusinessTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatDeclaredMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}
