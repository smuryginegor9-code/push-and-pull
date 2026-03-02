import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { apiRequest, isLikelyOffline } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { pushQueue, readQueue, setQueue } from "../lib/offlineQueue";
import type { Exercise, ExerciseLog, SetLog, WorkoutSession } from "../types";

type Props = {
  token: string;
};

type SaveStatus = "saved" | "saving" | "offline";

function buildSetCounts(logs: ExerciseLog[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const log of logs) {
    const maxSet = log.setLogs.reduce((acc, item) => Math.max(acc, item.setNumber), 0);
    map[log.exerciseId] = Math.max(log.exercise.defaultSets, maxSet || log.exercise.defaultSets || 4);
  }
  return map;
}

function getOrCreateSet(log: ExerciseLog, setNumber: number): SetLog {
  const existing = log.setLogs.find((setLog) => setLog.setNumber === setNumber);
  if (existing) return existing;

  return {
    id: `temp-${log.id}-${setNumber}`,
    exerciseLogId: log.id,
    setNumber,
    weight: 0,
    reps: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function WorkoutPage({ token }: Props): JSX.Element {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [setCounts, setSetCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [syncLabel, setSyncLabel] = useState<string>("Сохранено");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const draftKey = useMemo(() => `pushme-session-draft-${params.id ?? "unknown"}`, [params.id]);
  const saveTimers = useRef<Map<string, number>>(new Map());

  const loadSession = useCallback(async (): Promise<void> => {
    if (!params.id) return;

    setLoading(true);
    try {
      const fetched = await apiRequest<WorkoutSession>(`/sessions/${params.id}`, { token });
      setSession(fetched);
      setSetCounts(buildSetCounts(fetched.exerciseLogs));
      setExpanded(
        fetched.exerciseLogs.reduce<Record<string, boolean>>((acc, log, index) => {
          acc[log.id] = index === 0;
          return acc;
        }, {})
      );
      localStorage.setItem(draftKey, JSON.stringify(fetched));
    } catch (error) {
      const cached = localStorage.getItem(draftKey);
      if (cached) {
        const parsed = JSON.parse(cached) as WorkoutSession;
        setSession(parsed);
        setSetCounts(buildSetCounts(parsed.exerciseLogs));
        setSyncLabel("Оффлайн черновик");
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, [draftKey, params.id, token]);

  useEffect(() => {
    loadSession().catch(console.error);
  }, [loadSession]);

  useEffect(() => {
    if (session) {
      localStorage.setItem(draftKey, JSON.stringify(session));
    }
  }, [draftKey, session]);

  const flushOffline = useCallback(async (): Promise<void> => {
    const queue = readQueue();
    if (queue.length === 0) return;

    setSyncLabel(`Синхронизация (${queue.length})`);
    const remaining = [...queue];
    const failed: typeof queue = [];

    while (remaining.length > 0) {
      const item = remaining.shift()!;
      try {
        await apiRequest(item.path, {
          token,
          method: item.method,
          body: item.body
        });
      } catch (error) {
        if (isLikelyOffline(error)) {
          failed.push(item, ...remaining);
          break;
        }
      }
    }

    setQueue(failed);
    setSyncLabel(failed.length === 0 ? "Сохранено" : `Оффлайн (${failed.length})`);

    if (failed.length === 0) {
      await loadSession();
    }
  }, [loadSession, token]);

  useEffect(() => {
    const onOnline = () => {
      flushOffline().catch(console.error);
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushOffline]);

  const markStatus = (exerciseId: string, status: SaveStatus): void => {
    setSaveStatuses((prev) => ({ ...prev, [exerciseId]: status }));
  };

  const updateSetLocal = (exerciseId: string, setNumber: number, patch: Partial<SetLog>): void => {
    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exerciseLogs: prev.exerciseLogs.map((log) => {
          if (log.exerciseId !== exerciseId) return log;

          const existing = getOrCreateSet(log, setNumber);
          const nextSet: SetLog = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString()
          };

          const without = log.setLogs.filter((setLog) => setLog.setNumber !== setNumber);
          const setLogs = [...without, nextSet].sort((a, b) => a.setNumber - b.setNumber);

          return { ...log, setLogs };
        })
      };
    });
  };

  const scheduleSetSave = (exerciseId: string, setNumber: number, weight: number, reps: number): void => {
    if (!session) return;

    const key = `${exerciseId}-${setNumber}`;
    const prev = saveTimers.current.get(key);
    if (prev) window.clearTimeout(prev);

    markStatus(exerciseId, "saving");
    setSyncLabel("Сохраняем...");

    const timer = window.setTimeout(async () => {
      try {
        await apiRequest("/setlogs", {
          method: "POST",
          token,
          body: {
            sessionId: session.id,
            exerciseId,
            setNumber,
            weight,
            reps
          }
        });
        markStatus(exerciseId, "saved");
        setSyncLabel("Сохранено");
      } catch (error) {
        if (isLikelyOffline(error)) {
          pushQueue({
            method: "POST",
            path: "/setlogs",
            body: {
              sessionId: session.id,
              exerciseId,
              setNumber,
              weight,
              reps
            }
          });
          markStatus(exerciseId, "offline");
          setSyncLabel("Оффлайн");
          return;
        }
        console.error(error);
      }
    }, 380);

    saveTimers.current.set(key, timer);
  };

  const handleSetInput = (exerciseId: string, setNumber: number, field: "weight" | "reps", value: string): void => {
    const normalized = value.trim();
    const numeric = normalized === "" ? 0 : Number(normalized.replace(",", "."));

    if (!Number.isFinite(numeric)) return;

    const log = session?.exerciseLogs.find((item) => item.exerciseId === exerciseId);
    if (!log) return;

    const current = getOrCreateSet(log, setNumber);
    const nextWeight = field === "weight" ? numeric : current.weight;
    const nextReps = field === "reps" ? Math.max(0, Math.round(numeric)) : current.reps;

    updateSetLocal(exerciseId, setNumber, {
      weight: nextWeight,
      reps: nextReps
    });
    scheduleSetSave(exerciseId, setNumber, nextWeight, nextReps);
  };

  const tweakSet = (exerciseId: string, setNumber: number, kind: "kg" | "reps", delta: number): void => {
    const log = session?.exerciseLogs.find((item) => item.exerciseId === exerciseId);
    if (!log) return;

    const current = getOrCreateSet(log, setNumber);
    const nextWeight = kind === "kg" ? Math.max(0, Number((current.weight + delta).toFixed(2))) : current.weight;
    const nextReps = kind === "reps" ? Math.max(0, current.reps + delta) : current.reps;

    updateSetLocal(exerciseId, setNumber, { weight: nextWeight, reps: nextReps });
    scheduleSetSave(exerciseId, setNumber, nextWeight, nextReps);
  };

  const addSet = (log: ExerciseLog): void => {
    const currentCount = setCounts[log.exerciseId] ?? log.exercise.defaultSets;
    const nextSet = currentCount + 1;
    setSetCounts((prev) => ({ ...prev, [log.exerciseId]: nextSet }));

    const last = log.setLogs.find((setLog) => setLog.setNumber === currentCount);
    const weight = last?.weight ?? 0;
    const reps = last?.reps ?? 0;

    updateSetLocal(log.exerciseId, nextSet, { weight, reps });
    scheduleSetSave(log.exerciseId, nextSet, weight, reps);
  };

  const removeLastSet = async (log: ExerciseLog): Promise<void> => {
    if (!session) return;

    const currentCount = setCounts[log.exerciseId] ?? log.exercise.defaultSets;
    if (currentCount <= 1) return;

    const targetSetNumber = currentCount;
    setSetCounts((prev) => ({ ...prev, [log.exerciseId]: currentCount - 1 }));

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exerciseLogs: prev.exerciseLogs.map((item) =>
          item.exerciseId === log.exerciseId
            ? { ...item, setLogs: item.setLogs.filter((setLog) => setLog.setNumber !== targetSetNumber) }
            : item
        )
      };
    });

    try {
      await apiRequest("/setlogs", {
        method: "DELETE",
        token,
        body: {
          sessionId: session.id,
          exerciseId: log.exerciseId,
          setNumber: targetSetNumber
        }
      });
    } catch (error) {
      if (isLikelyOffline(error)) {
        pushQueue({
          method: "DELETE",
          path: "/setlogs",
          body: {
            sessionId: session.id,
            exerciseId: log.exerciseId,
            setNumber: targetSetNumber
          }
        });
        markStatus(log.exerciseId, "offline");
      }
    }
  };

  const copyLast = async (exerciseId: string): Promise<void> => {
    if (!session) return;

    let copied: ExerciseLog;
    try {
      copied = await apiRequest<ExerciseLog>(`/sessions/${session.id}/exercises/${exerciseId}/copy-last`, {
        method: "POST",
        token
      });
    } catch (error) {
      setSyncLabel(error instanceof Error ? error.message : "Не удалось скопировать прошлые подходы");
      return;
    }

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exerciseLogs: prev.exerciseLogs.map((log) =>
          log.exerciseId === exerciseId
            ? {
                ...log,
                setLogs: copied.setLogs
              }
            : log
        )
      };
    });

    const maxSet = copied.setLogs.reduce((acc, item) => Math.max(acc, item.setNumber), 0);
    setSetCounts((prev) => ({ ...prev, [exerciseId]: Math.max(prev[exerciseId] ?? 4, maxSet) }));
    markStatus(exerciseId, "saved");
  };

  const finishSession = async (): Promise<void> => {
    if (!session) return;

    const updated = await apiRequest<WorkoutSession>(`/sessions/${session.id}`, {
      method: "PATCH",
      token,
      body: {
        endedAt: new Date().toISOString()
      }
    });

    setSession(updated);
    navigate("/");
  };

  const toggleCardio = async (): Promise<void> => {
    if (!session) return;

    const hasCardio = session.notes?.includes("#cardio") ?? false;
    const nextNotes = hasCardio
      ? (session.notes ?? "").replace("#cardio", "").trim() || null
      : `${session.notes ? `${session.notes}\n` : ""}#cardio`;

    const updated = await apiRequest<WorkoutSession>(`/sessions/${session.id}`, {
      method: "PATCH",
      token,
      body: {
        notes: nextNotes
      }
    });

    setSession(updated);
  };

  const addExerciseToSession = async (exercise: Exercise): Promise<void> => {
    if (!session) return;

    const created = await apiRequest<ExerciseLog>(`/sessions/${session.id}/exercises/${exercise.id}`, {
      method: "POST",
      token,
      body: {}
    });

    setSession((prev) => {
      if (!prev) return prev;
      const already = prev.exerciseLogs.some((log) => log.exerciseId === exercise.id);
      if (already) return prev;
      return {
        ...prev,
        exerciseLogs: [...prev.exerciseLogs, { ...created, exercise }].sort((a, b) => a.orderIndex - b.orderIndex)
      };
    });

    setSetCounts((prev) => ({ ...prev, [exercise.id]: exercise.defaultSets || 4 }));
    setSearchQuery("");
    setSearchResults([]);
  };

  const createAndAddExercise = async (): Promise<void> => {
    const name = newExerciseName.trim();
    if (!name) return;

    const created = await apiRequest<Exercise>("/exercises", {
      method: "POST",
      token,
      body: {
        name,
        defaultSets: 4
      }
    });

    await addExerciseToSession(created);
    setNewExerciseName("");
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      const list = await apiRequest<Exercise[]>(`/exercises?q=${encodeURIComponent(searchQuery)}`, { token });
      setSearchResults(list);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery, token]);

  if (loading || !session) {
    return <PageShell title="Тренировка">Загрузка...</PageShell>;
  }

  const cardioDone = session.notes?.includes("#cardio") ?? false;

  return (
    <PageShell
      title="Тренировка"
      actions={
        <button
          type="button"
          onClick={() => finishSession()}
          className="rounded-xl bg-success px-3 py-2 text-sm font-bold text-slate-900"
        >
          Завершить
        </button>
      }
    >
      <div className="rounded-3xl bg-card p-4 shadow-card">
        <p className="text-sm text-subtle">Старт: {formatDateTime(session.startedAt)}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-2xl px-4 py-3 text-base font-bold ${
              cardioDone ? "bg-success text-slate-900" : "bg-white/10 text-text"
            }`}
            onClick={() => toggleCardio()}
          >
            Кардио {cardioDone ? "✓" : ""}
          </button>
          <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-subtle">{syncLabel}</div>
        </div>
      </div>

      <div className="space-y-3">
        {session.exerciseLogs
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((log) => {
            const count = setCounts[log.exerciseId] ?? log.exercise.defaultSets;
            const rows = Array.from({ length: count }, (_, index) => index + 1);
            const status = saveStatuses[log.exerciseId] ?? "saved";

            return (
              <article key={log.id} className="rounded-3xl bg-card p-3 shadow-card">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [log.id]: !prev[log.id] }))}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-3 text-left"
                >
                  <div>
                    <p className="text-base font-bold text-text">{log.exercise.name}</p>
                    <p className="text-xs text-subtle">
                      {log.exercise.muscleGroup ?? "Упражнение"} • {status === "saving" ? "Сохраняем" : status === "offline" ? "Оффлайн" : "Сохранено"}
                    </p>
                  </div>
                  <span className="text-xl text-subtle">{expanded[log.id] ? "−" : "+"}</span>
                </button>

                {expanded[log.id] && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-text"
                        onClick={() => copyLast(log.exerciseId)}
                      >
                        Скопировать прошлый раз
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-text"
                        onClick={() => removeLastSet(log)}
                      >
                        Удалить последний подход
                      </button>
                    </div>

                    {rows.map((setNumber) => {
                      const setLog = getOrCreateSet(log, setNumber);
                      return (
                        <div key={`${log.id}-${setNumber}`} className="rounded-2xl bg-white/5 p-3">
                          <p className="mb-2 text-sm font-semibold text-subtle">Подход {setNumber}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.5"
                              value={setLog.weight || ""}
                              onChange={(event) =>
                                handleSetInput(log.exerciseId, setNumber, "weight", event.target.value)
                              }
                              placeholder="Вес, кг"
                              className="rounded-xl border border-white/15 bg-surface px-3 py-3 text-lg font-semibold text-text outline-none"
                            />
                            <input
                              type="number"
                              step="1"
                              value={setLog.reps || ""}
                              onChange={(event) =>
                                handleSetInput(log.exerciseId, setNumber, "reps", event.target.value)
                              }
                              placeholder="Повторы"
                              className="rounded-xl border border-white/15 bg-surface px-3 py-3 text-lg font-semibold text-text outline-none"
                            />
                          </div>

                          <div className="mt-2 grid grid-cols-5 gap-2 text-sm">
                            <button
                              type="button"
                              className="rounded-xl bg-white/10 px-2 py-2 font-semibold text-text"
                              onClick={() => tweakSet(log.exerciseId, setNumber, "kg", -2.5)}
                            >
                              -2.5
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-white/10 px-2 py-2 font-semibold text-text"
                              onClick={() => tweakSet(log.exerciseId, setNumber, "kg", 2.5)}
                            >
                              +2.5
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-white/10 px-2 py-2 font-semibold text-text"
                              onClick={() => tweakSet(log.exerciseId, setNumber, "kg", 5)}
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-white/10 px-2 py-2 font-semibold text-text"
                              onClick={() => tweakSet(log.exerciseId, setNumber, "reps", -1)}
                            >
                              -1R
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-white/10 px-2 py-2 font-semibold text-text"
                              onClick={() => tweakSet(log.exerciseId, setNumber, "reps", 1)}
                            >
                              +1R
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="w-full rounded-2xl bg-accent px-4 py-3 text-base font-bold text-slate-900"
                      onClick={() => addSet(log)}
                    >
                      + Добавить подход
                    </button>
                  </div>
                )}
              </article>
            );
          })}
      </div>

      <section className="rounded-3xl bg-card p-4 shadow-card">
        <p className="text-base font-bold text-text">Быстро добавить упражнение</p>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Начни вводить название"
          className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
            {searchResults.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="rounded-xl bg-white/10 px-3 py-2 text-left text-sm text-text"
                onClick={() => addExerciseToSession(exercise)}
              >
                {exercise.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={newExerciseName}
            onChange={(event) => setNewExerciseName(event.target.value)}
            placeholder="Новое упражнение"
            className="flex-1 rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
          />
          <button
            type="button"
            className="rounded-xl bg-accent px-4 py-3 text-base font-extrabold text-slate-900"
            onClick={() => createAndAddExercise()}
          >
            +
          </button>
        </div>
      </section>
    </PageShell>
  );
}
