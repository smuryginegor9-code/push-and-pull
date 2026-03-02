import type { PrismaClient } from "@prisma/client";
import { endOfISOWeek, startOfISOWeek, subMonths, subWeeks } from "date-fns";

export type AnalyticsMetric = "max_weight" | "volume" | "avg_weight";
export type AnalyticsPeriod = "1m" | "3m" | "all";
export type AnalyticsMode = "real" | "e1rm";

function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function resolveFromDate(period: AnalyticsPeriod): Date | undefined {
  const now = new Date();
  if (period === "1m") return subMonths(now, 1);
  if (period === "3m") return subMonths(now, 3);
  return undefined;
}

function resolveSetValue(weight: number, reps: number, mode: AnalyticsMode): number {
  if (mode === "e1rm") return epley(weight, reps);
  return weight;
}

export async function getExerciseAnalytics(
  prisma: PrismaClient,
  userId: string,
  exerciseId: string,
  period: AnalyticsPeriod,
  metric: AnalyticsMetric,
  mode: AnalyticsMode
): Promise<Array<{ date: string; value: number; sessionId: string }>> {
  const fromDate = resolveFromDate(period);

  const logs = await prisma.exerciseLog.findMany({
    where: {
      exerciseId,
      session: {
        userId,
        ...(fromDate ? { startedAt: { gte: fromDate } } : {})
      }
    },
    include: {
      session: true,
      setLogs: {
        orderBy: { setNumber: "asc" }
      }
    },
    orderBy: { session: { startedAt: "asc" } }
  });

  return logs
    .map((log) => {
      const prepared = log.setLogs.map((setLog) => {
        const weight = Number(setLog.weight);
        const reps = setLog.reps;
        return {
          weight,
          reps,
          value: resolveSetValue(weight, reps, mode)
        };
      });

      if (prepared.length === 0) return null;

      let value = 0;
      if (metric === "max_weight") {
        value = Math.max(...prepared.map((item) => item.value));
      }
      if (metric === "avg_weight") {
        value = prepared.reduce((acc, item) => acc + item.value, 0) / prepared.length;
      }
      if (metric === "volume") {
        value = prepared.reduce((acc, item) => acc + item.weight * item.reps, 0);
      }

      return {
        date: log.session.startedAt.toISOString().slice(0, 10),
        value: Number(value.toFixed(2)),
        sessionId: log.sessionId
      };
    })
    .filter((entry): entry is { date: string; value: number; sessionId: string } => Boolean(entry));
}

export function getAnalyticsSummary(points: Array<{ date: string; value: number }>): {
  lastResult: number;
  deltaFromPrev: number;
  bestResult: number;
  improvementStreak: number;
} {
  if (points.length === 0) {
    return {
      lastResult: 0,
      deltaFromPrev: 0,
      bestResult: 0,
      improvementStreak: 0
    };
  }

  const values = points.map((point) => point.value);
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? last;

  let streak = 0;
  for (let i = values.length - 1; i > 0; i -= 1) {
    if (values[i] > values[i - 1]) {
      streak += 1;
      continue;
    }
    break;
  }

  return {
    lastResult: Number(last.toFixed(2)),
    deltaFromPrev: Number((last - prev).toFixed(2)),
    bestResult: Number(Math.max(...values).toFixed(2)),
    improvementStreak: streak
  };
}

export async function getWeeklyPersonalProgress(prisma: PrismaClient, userId: string): Promise<{
  currentWeekVolume: number;
  previousWeekVolume: number;
  changePercent: number;
  topExercise: { exerciseId: string; exerciseName: string; delta: number } | null;
}> {
  const now = new Date();
  const currentStart = startOfISOWeek(now);
  const currentEnd = endOfISOWeek(now);
  const prevStart = startOfISOWeek(subWeeks(now, 1));
  const prevEnd = endOfISOWeek(subWeeks(now, 1));

  const [currentLogs, previousLogs] = await Promise.all([
    prisma.setLog.findMany({
      where: {
        exerciseLog: {
          session: {
            userId,
            startedAt: {
              gte: currentStart,
              lte: currentEnd
            }
          }
        }
      },
      include: {
        exerciseLog: {
          include: {
            exercise: true
          }
        }
      }
    }),
    prisma.setLog.findMany({
      where: {
        exerciseLog: {
          session: {
            userId,
            startedAt: {
              gte: prevStart,
              lte: prevEnd
            }
          }
        }
      },
      include: {
        exerciseLog: {
          include: {
            exercise: true
          }
        }
      }
    })
  ]);

  const sumVolume = (list: typeof currentLogs): number =>
    Number(
      list
        .reduce((acc, setLog) => acc + Number(setLog.weight) * setLog.reps, 0)
        .toFixed(2)
    );

  const currentWeekVolume = sumVolume(currentLogs);
  const previousWeekVolume = sumVolume(previousLogs);

  const byExercise = new Map<string, { name: string; current: number; previous: number }>();

  for (const setLog of currentLogs) {
    const key = setLog.exerciseLog.exerciseId;
    const entry = byExercise.get(key) ?? {
      name: setLog.exerciseLog.exercise.name,
      current: 0,
      previous: 0
    };
    entry.current += Number(setLog.weight) * setLog.reps;
    byExercise.set(key, entry);
  }

  for (const setLog of previousLogs) {
    const key = setLog.exerciseLog.exerciseId;
    const entry = byExercise.get(key) ?? {
      name: setLog.exerciseLog.exercise.name,
      current: 0,
      previous: 0
    };
    entry.previous += Number(setLog.weight) * setLog.reps;
    byExercise.set(key, entry);
  }

  const top = [...byExercise.entries()]
    .map(([exerciseId, entry]) => ({
      exerciseId,
      exerciseName: entry.name,
      delta: Number((entry.current - entry.previous).toFixed(2))
    }))
    .sort((a, b) => b.delta - a.delta)[0] ?? null;

  const changePercent = previousWeekVolume === 0
    ? (currentWeekVolume > 0 ? 100 : 0)
    : Number((((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100).toFixed(2));

  return {
    currentWeekVolume,
    previousWeekVolume,
    changePercent,
    topExercise: top
  };
}
