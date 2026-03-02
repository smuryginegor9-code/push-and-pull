import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { apiRequest } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { WorkoutSession, WorkoutTemplate } from "../types";

type Props = {
  token: string;
};

export function HistoryPage({ token }: Props): JSX.Element {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<WorkoutSession[]>("/sessions", { token }),
      apiRequest<WorkoutTemplate[]>("/templates", { token })
    ])
      .then(([sessionsData, templatesData]) => {
        setSessions(sessionsData);
        setTemplates(templatesData);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template.name])),
    [templates]
  );

  return (
    <PageShell title="История">
      {loading && <div className="rounded-2xl bg-card p-4 text-subtle">Загрузка...</div>}

      <div className="space-y-3">
        {sessions.map((session) => {
          const volume = session.exerciseLogs
            .flatMap((log) => log.setLogs)
            .reduce((acc, setLog) => acc + setLog.weight * setLog.reps, 0);

          return (
            <article key={session.id} className="rounded-3xl bg-card p-4 shadow-card">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpanded((prev) => ({ ...prev, [session.id]: !prev[session.id] }))}
              >
                <div>
                  <p className="text-base font-bold text-text">{formatDateTime(session.startedAt)}</p>
                  <p className="text-sm text-subtle">
                    {session.templateId ? templateById.get(session.templateId) ?? "По шаблону" : "Своя тренировка"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">{Math.round(volume)} кг</p>
                  <p className="text-xs text-subtle">{session.exerciseLogs.length} упражнений</p>
                </div>
              </button>

              {expanded[session.id] && (
                <div className="mt-3 space-y-2 rounded-2xl bg-white/5 p-3">
                  {session.exerciseLogs.map((log) => (
                    <div key={log.id} className="rounded-xl bg-white/5 p-2">
                      <p className="text-sm font-semibold text-text">{log.exercise.name}</p>
                      <p className="text-xs text-subtle">
                        {log.setLogs
                          .map((setLog) => `${setLog.setNumber}: ${setLog.weight}×${setLog.reps}`)
                          .join(" • ") || "Без подходов"}
                      </p>
                    </div>
                  ))}
                  <Link
                    to={`/session/${session.id}`}
                    className="mt-2 inline-block rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-text"
                  >
                    Открыть тренировку
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
