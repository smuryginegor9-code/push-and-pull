import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageShell } from "../components/PageShell";
import { apiRequest } from "../lib/api";
import { formatDateLabel, formatNumber } from "../lib/format";
import type { Exercise } from "../types";

type Props = {
  token: string;
};

type Metric = "max_weight" | "volume" | "avg_weight";
type Period = "1m" | "3m" | "all";
type Mode = "real" | "e1rm";

type Point = {
  date: string;
  value: number;
};

type Summary = {
  lastResult: number;
  deltaFromPrev: number;
  bestResult: number;
  improvementStreak: number;
};

type WeeklyProgress = {
  currentWeekVolume: number;
  previousWeekVolume: number;
  changePercent: number;
  topExercise: {
    exerciseId: string;
    exerciseName: string;
    delta: number;
  } | null;
};

export function ProgressPage({ token }: Props): JSX.Element {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [metric, setMetric] = useState<Metric>("max_weight");
  const [period, setPeriod] = useState<Period>("3m");
  const [mode, setMode] = useState<Mode>("real");
  const [points, setPoints] = useState<Point[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);

  useEffect(() => {
    apiRequest<Exercise[]>("/exercises", { token }).then((list) => {
      setExercises(list);
      if (list[0]) setExerciseId(list[0].id);
    });

    apiRequest<WeeklyProgress>("/analytics/weekly-progress", { token }).then(setWeekly);
  }, [token]);

  useEffect(() => {
    if (!exerciseId) return;

    const params = new URLSearchParams({ period, metric, mode });

    Promise.all([
      apiRequest<Point[]>(`/analytics/exercise/${exerciseId}?${params.toString()}`, { token }),
      apiRequest<Summary>(`/analytics/exercise/${exerciseId}/summary?${params.toString()}`, { token })
    ]).then(([series, stats]) => {
      setPoints(series);
      setSummary(stats);
    });
  }, [exerciseId, metric, mode, period, token]);

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        date: formatDateLabel(point.date),
        value: point.value
      })),
    [points]
  );

  return (
    <PageShell title="Прогресс">
      <section className="rounded-3xl bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 gap-2">
          <select
            value={exerciseId}
            onChange={(event) => setExerciseId(event.target.value)}
            className="rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as Metric)}
              className="rounded-xl border border-white/15 bg-surface px-2 py-3 text-sm text-text outline-none"
            >
              <option value="max_weight">Макс вес</option>
              <option value="volume">Объем</option>
              <option value="avg_weight">Средний вес</option>
            </select>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="rounded-xl border border-white/15 bg-surface px-2 py-3 text-sm text-text outline-none"
            >
              <option value="1m">1 месяц</option>
              <option value="3m">3 месяца</option>
              <option value="all">Все время</option>
            </select>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-xl border border-white/15 bg-surface px-2 py-3 text-sm text-text outline-none"
            >
              <option value="real">Реальный вес</option>
              <option value="e1rm">Оценочный 1RM</option>
            </select>
          </div>
        </div>

        <div className="mt-4 h-64 w-full rounded-2xl bg-surface/80 p-2">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-subtle">Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="date" stroke="#9aa7b5" />
                <YAxis stroke="#9aa7b5" />
                <Tooltip
                  contentStyle={{
                    background: "#171e26",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    color: "#ecf2f8"
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="text-xs text-subtle">Последний результат</p>
            <p className="text-xl font-extrabold text-text">{formatNumber(summary.lastResult)}</p>
          </div>
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="text-xs text-subtle">Разница с прошлым</p>
            <p className={`text-xl font-extrabold ${summary.deltaFromPrev >= 0 ? "text-success" : "text-danger"}`}>
              {summary.deltaFromPrev >= 0 ? "+" : ""}
              {formatNumber(summary.deltaFromPrev)}
            </p>
          </div>
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="text-xs text-subtle">Лучший результат</p>
            <p className="text-xl font-extrabold text-text">{formatNumber(summary.bestResult)}</p>
          </div>
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="text-xs text-subtle">Серия улучшений</p>
            <p className="text-xl font-extrabold text-text">{summary.improvementStreak}</p>
          </div>
        </section>
      )}

      {weekly && (
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <p className="text-base font-bold text-text">Личный прогресс недели</p>
          <p className="mt-2 text-sm text-subtle">Объем недели: {formatNumber(weekly.currentWeekVolume)} кг</p>
          <p className={`mt-1 text-sm font-semibold ${weekly.changePercent >= 0 ? "text-success" : "text-danger"}`}>
            Изменение к прошлой: {weekly.changePercent >= 0 ? "+" : ""}
            {formatNumber(weekly.changePercent)}%
          </p>
          <p className="mt-1 text-sm text-subtle">
            Самое прогрессирующее упражнение: {weekly.topExercise ? `${weekly.topExercise.exerciseName} (${formatNumber(weekly.topExercise.delta)})` : "нет"}
          </p>
        </section>
      )}
    </PageShell>
  );
}
