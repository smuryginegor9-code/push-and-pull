import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { apiRequest } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Exercise, User, WorkoutSession, WorkoutTemplate } from "../types";

type Props = {
  token: string;
  user: User;
};

export function TodayPage({ token, user }: Props): JSX.Element {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");

  const activeSession = useMemo(
    () => sessions.find((session) => session.endedAt === null),
    [sessions]
  );

  const editTemplate = useMemo(
    () => templates.find((item) => item.id === editTemplateId) ?? null,
    [templates, editTemplateId]
  );

  const loadData = async (): Promise<void> => {
    setLoading(true);
    const [fetchedTemplates, fetchedSessions] = await Promise.all([
      apiRequest<WorkoutTemplate[]>("/templates", { token }),
      apiRequest<WorkoutSession[]>("/sessions", { token })
    ]);
    setTemplates(fetchedTemplates);
    setSessions(fetchedSessions);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (!editTemplate || exerciseQuery.trim().length < 2) {
      setExerciseResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      const list = await apiRequest<Exercise[]>(`/exercises?q=${encodeURIComponent(exerciseQuery)}`, { token });
      setExerciseResults(list);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [editTemplate, exerciseQuery, token]);

  const startSession = async (templateId: string | null): Promise<void> => {
    const created = await apiRequest<WorkoutSession>("/sessions", {
      method: "POST",
      token,
      body: { templateId }
    });
    navigate(`/session/${created.id}`);
  };

  const updateTemplateEntry = async (
    id: string,
    payload: { enabled?: boolean; orderIndex?: number },
    reload = true
  ): Promise<void> => {
    await apiRequest(`/template-exercises/${id}`, {
      method: "PATCH",
      token,
      body: payload
    });
    if (reload) {
      await loadData();
    }
  };

  const addExerciseToTemplate = async (exerciseId: string): Promise<void> => {
    if (!editTemplate) return;

    await apiRequest("/template-exercises", {
      method: "POST",
      token,
      body: {
        templateId: editTemplate.id,
        exerciseId
      }
    });

    setExerciseQuery("");
    setExerciseResults([]);
    setNewExerciseName("");
    await loadData();
  };

  const createAndAddExercise = async (): Promise<void> => {
    const name = newExerciseName.trim();
    if (!name || !editTemplate) return;

    const created = await apiRequest<Exercise>("/exercises", {
      method: "POST",
      token,
      body: {
        name,
        defaultSets: 4
      }
    });

    await addExerciseToTemplate(created.id);
  };

  const moveEntry = async (
    list: WorkoutTemplate["templateEntries"],
    index: number,
    direction: "up" | "down"
  ): Promise<void> => {
    const target = list[index];
    if (!target) return;

    const sibling = direction === "up" ? list[index - 1] : list[index + 1];
    if (!sibling) return;

    await Promise.all([
      updateTemplateEntry(target.id, { orderIndex: sibling.orderIndex }, false),
      updateTemplateEntry(sibling.id, { orderIndex: target.orderIndex }, false)
    ]);
    await loadData();
  };

  return (
    <PageShell
      title={`Сегодня, ${user.firstName ?? user.username ?? "атлет"}`}
      actions={
        <button
          type="button"
          onClick={() => loadData()}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-text"
        >
          Обновить
        </button>
      }
    >
      {loading && <div className="rounded-2xl bg-card p-4 text-subtle">Загрузка...</div>}

      {activeSession && (
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <p className="text-sm text-subtle">Незавершённая тренировка</p>
          <p className="mt-1 text-base font-semibold text-text">Начата: {formatDateTime(activeSession.startedAt)}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-base font-bold text-slate-900"
            onClick={() => navigate(`/session/${activeSession.id}`)}
          >
            Продолжить
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-3xl bg-card p-4 shadow-card">
            <p className="text-lg font-bold text-text">{template.name}</p>
            <p className="mt-1 text-sm text-subtle">{template.templateEntries.filter((item) => item.enabled).length} активных упражнений</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => startSession(template.id)}
                className="rounded-2xl bg-accent px-4 py-3 text-base font-bold text-slate-900"
              >
                Старт
              </button>
              <button
                type="button"
                onClick={() => setEditTemplateId(template.id)}
                className="rounded-2xl bg-white/10 px-4 py-3 text-base font-semibold text-text"
              >
                Настроить
              </button>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="rounded-3xl border border-dashed border-white/25 bg-card/70 px-4 py-4 text-left shadow-card"
          onClick={() => startSession(null)}
        >
          <p className="text-lg font-bold text-text">Своя тренировка</p>
          <p className="text-sm text-subtle">Пустая сессия + быстрое добавление упражнений</p>
        </button>
      </section>

      {editTemplate && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 p-3">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-text">Программа: {editTemplate.name}</h2>
              <button
                type="button"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm text-subtle"
                onClick={() => setEditTemplateId(null)}
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-2">
              {editTemplate.templateEntries
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((entry, index, list) => (
                  <div key={entry.id} className="rounded-2xl bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text">{entry.exercise.name}</p>
                        <p className="text-xs text-subtle">{entry.exercise.muscleGroup ?? "Без группы"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-white/10 px-2 py-1 text-xs text-text"
                          onClick={() => moveEntry(list, index, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-white/10 px-2 py-1 text-xs text-text"
                          onClick={() => moveEntry(list, index, "down")}
                        >
                          ↓
                        </button>
                        <label className="inline-flex items-center gap-2 text-xs text-subtle">
                          <input
                            checked={entry.enabled}
                            onChange={(event) => updateTemplateEntry(entry.id, { enabled: event.target.checked })}
                            type="checkbox"
                            className="h-4 w-4"
                          />
                          Вкл
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 p-3">
              <p className="mb-2 font-semibold text-text">Добавить упражнение</p>
              <input
                value={exerciseQuery}
                onChange={(event) => setExerciseQuery(event.target.value)}
                placeholder="Поиск упражнения"
                className="w-full rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
              />
              {exerciseResults.length > 0 && (
                <div className="mt-2 flex max-h-36 flex-col gap-1 overflow-y-auto">
                  {exerciseResults.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className="rounded-xl bg-white/10 px-3 py-2 text-left text-sm text-text"
                      onClick={() => addExerciseToTemplate(exercise.id)}
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
                  className="rounded-xl bg-accent px-4 py-3 font-bold text-slate-900"
                  onClick={() => createAndAddExercise()}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
