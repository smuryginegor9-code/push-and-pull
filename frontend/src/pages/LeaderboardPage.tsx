import { FormEvent, useEffect, useState } from "react";
import { PageShell } from "../components/PageShell";
import { apiRequest } from "../lib/api";
import { formatNumber, getCurrentIsoWeekLabel } from "../lib/format";
import type { Group, LeaderboardRow, User } from "../types";

type Props = {
  token: string;
  user: User;
};

type LeaderboardResponse = {
  week: string;
  start: string;
  end: string;
  rows: LeaderboardRow[];
};

export function LeaderboardPage({ token, user }: Props): JSX.Element {
  const [group, setGroup] = useState<Group | null>(null);
  const [week, setWeek] = useState(getCurrentIsoWeekLabel());
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);

  const loadGroupAndLeaderboard = async (): Promise<void> => {
    setLoading(true);
    const myGroup = await apiRequest<Group | null>("/groups/my", { token });
    setGroup(myGroup);

    const board = await apiRequest<LeaderboardResponse>(`/leaderboard?week=${week}`, { token });
    setRows(board.rows);
    setLoading(false);
  };

  useEffect(() => {
    loadGroupAndLeaderboard().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [token, week]);

  const createGroup = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!groupName.trim()) return;

    await apiRequest<Group>("/groups", {
      method: "POST",
      token,
      body: { name: groupName.trim() }
    });

    setGroupName("");
    await loadGroupAndLeaderboard();
  };

  const joinGroup = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!joinCode.trim()) return;

    await apiRequest<Group>("/groups/join", {
      method: "POST",
      token,
      body: { code: joinCode.trim() }
    });

    setJoinCode("");
    await loadGroupAndLeaderboard();
  };

  return (
    <PageShell title="Лидерборд недели">
      <section className="rounded-3xl bg-card p-4 shadow-card">
        <p className="text-sm text-subtle">ISO неделя</p>
        <input
          value={week}
          onChange={(event) => setWeek(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-3 text-base font-semibold text-text outline-none"
          placeholder="2026-W10"
        />
      </section>

      {!group && (
        <section className="space-y-3 rounded-3xl bg-card p-4 shadow-card">
          <p className="text-base font-bold text-text">Создай группу или вступи по коду</p>
          <form className="flex gap-2" onSubmit={(event) => createGroup(event)}>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Название группы"
              className="flex-1 rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
            />
            <button type="submit" className="rounded-xl bg-accent px-4 py-3 font-bold text-slate-900">
              Создать
            </button>
          </form>
          <form className="flex gap-2" onSubmit={(event) => joinGroup(event)}>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Invite-код"
              className="flex-1 rounded-xl border border-white/15 bg-surface px-3 py-3 text-text outline-none"
            />
            <button type="submit" className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-text">
              Вступить
            </button>
          </form>
        </section>
      )}

      {group && (
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <p className="text-base font-bold text-text">{group.name}</p>
          <p className="mt-1 text-sm text-subtle">Invite: {group.inviteCode}</p>
          <p className="mt-1 text-sm text-subtle">Участников: {group.members.length}</p>
        </section>
      )}

      <section className="rounded-3xl bg-card p-3 shadow-card">
        {loading ? (
          <p className="p-2 text-subtle">Загрузка...</p>
        ) : rows.length === 0 ? (
          <p className="p-2 text-subtle">За выбранную неделю подходов пока нет.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const isMe = row.userId === user.id;
              return (
                <div
                  key={row.userId}
                  className={`grid grid-cols-[48px_1fr_auto] items-center gap-2 rounded-2xl px-3 py-3 ${
                    isMe ? "bg-accent/20" : "bg-white/5"
                  }`}
                >
                  <p className="text-lg font-extrabold text-text">#{row.rank}</p>
                  <div>
                    <p className="text-sm font-bold text-text">{row.name}</p>
                    <p className="text-xs text-subtle">Тренировок: {row.workouts}</p>
                  </div>
                  <p className="text-sm font-bold text-text">{formatNumber(row.totalVolume)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
