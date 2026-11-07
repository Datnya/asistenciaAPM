const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function nextReportDay(date: string) {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function reportPeriodLabel(from: string, to: string) {
  const [fromYear = 0, fromMonth = 1, fromDay = 1] = from.split("-").map(Number);
  const [toYear = 0, toMonth = 1, toDay = 1] = to.split("-").map(Number);
  const first = `${fromDay} de ${months[fromMonth - 1]}${fromYear === toYear ? "" : ` de ${fromYear}`}`;
  return `del ${first} al ${toDay} de ${months[toMonth - 1]} de ${toYear}`;
}

export function reportFileName(from: string, to: string) {
  return `Avance ${reportPeriodLabel(from, to)}.xlsx`;
}
