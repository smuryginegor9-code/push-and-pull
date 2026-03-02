import { addWeeks, endOfISOWeek, format, startOfISOWeek } from "date-fns";

export type WeekRange = {
  label: string;
  start: Date;
  end: Date;
};

export function getCurrentIsoWeekLabel(date = new Date()): string {
  const year = Number(format(date, "RRRR"));
  const week = format(date, "II");
  return `${year}-W${week}`;
}

export function parseIsoWeek(weekLabel?: string): WeekRange {
  const label = weekLabel ?? getCurrentIsoWeekLabel();
  const match = label.match(/^(\d{4})-W(\d{2})$/);

  if (!match) {
    throw new Error("Week format must be YYYY-Www");
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) {
    throw new Error("Week number out of range");
  }

  const jan4 = new Date(year, 0, 4);
  const firstWeekStart = startOfISOWeek(jan4);
  const start = addWeeks(firstWeekStart, week - 1);
  const end = endOfISOWeek(start);

  return { label, start, end };
}
