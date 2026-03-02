export function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} кг`;
}

export function formatDateLabel(input: string): string {
  const date = new Date(input);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short"
  });
}

export function formatDateTime(input: string): string {
  const date = new Date(input);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getCurrentIsoWeekLabel(date = new Date()): string {
  const temporary = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  temporary.setUTCDate(temporary.getUTCDate() + 4 - (temporary.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(temporary.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temporary.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${temporary.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
