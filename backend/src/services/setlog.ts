export type SetLogInput = {
  setNumber: number;
  weight: number;
  reps: number;
};

export function upsertSetLogsArray(existing: SetLogInput[], next: SetLogInput): SetLogInput[] {
  const withoutTarget = existing.filter((item) => item.setNumber !== next.setNumber);
  return [...withoutTarget, next].sort((a, b) => a.setNumber - b.setNumber);
}
