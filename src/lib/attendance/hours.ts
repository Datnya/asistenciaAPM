const timePattern = /^([01]\d|2[0-4]):([0-5]\d)$/;

export function declaredHoursToMinutes(value: string) {
  const match = timePattern.exec(value);
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
