import { describe, expect, it } from "vitest";
import { calculateLeaderboardRows } from "../src/services/leaderboard.js";

describe("calculateLeaderboardRows", () => {
  it("aggregates volume and sessions per user", () => {
    const rows = calculateLeaderboardRows([
      { userId: "u1", userName: "Alex", sessionId: "s1", weight: 100, reps: 5 },
      { userId: "u1", userName: "Alex", sessionId: "s1", weight: 90, reps: 8 },
      { userId: "u2", userName: "Nina", sessionId: "s2", weight: 80, reps: 10 },
      { userId: "u2", userName: "Nina", sessionId: "s3", weight: 70, reps: 10 }
    ]);

    expect(rows).toEqual([
      { rank: 1, userId: "u2", name: "Nina", totalVolume: 1500, workouts: 2 },
      { rank: 2, userId: "u1", name: "Alex", totalVolume: 1220, workouts: 1 }
    ]);
  });
});
