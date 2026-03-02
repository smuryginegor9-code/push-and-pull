export type LeaderboardInput = {
  userId: string;
  userName: string;
  sessionId: string;
  weight: number;
  reps: number;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  totalVolume: number;
  workouts: number;
};

export function calculateLeaderboardRows(items: LeaderboardInput[]): LeaderboardRow[] {
  const map = new Map<string, { name: string; volume: number; sessions: Set<string> }>();

  for (const item of items) {
    const current = map.get(item.userId) ?? { name: item.userName, volume: 0, sessions: new Set<string>() };
    current.volume += item.weight * item.reps;
    current.sessions.add(item.sessionId);
    map.set(item.userId, current);
  }

  return [...map.entries()]
    .map(([userId, value]) => ({
      userId,
      name: value.name,
      totalVolume: Number(value.volume.toFixed(2)),
      workouts: value.sessions.size,
      rank: 0
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
