import { describe, expect, it } from "vitest";
import { upsertSetLogsArray } from "../src/services/setlog.js";

describe("upsertSetLogsArray", () => {
  it("replaces set with same setNumber", () => {
    const result = upsertSetLogsArray(
      [
        { setNumber: 1, weight: 50, reps: 10 },
        { setNumber: 2, weight: 55, reps: 8 }
      ],
      { setNumber: 2, weight: 57.5, reps: 8 }
    );

    expect(result).toEqual([
      { setNumber: 1, weight: 50, reps: 10 },
      { setNumber: 2, weight: 57.5, reps: 8 }
    ]);
  });

  it("inserts new set and keeps sorting", () => {
    const result = upsertSetLogsArray(
      [{ setNumber: 2, weight: 60, reps: 6 }],
      { setNumber: 1, weight: 50, reps: 12 }
    );

    expect(result).toEqual([
      { setNumber: 1, weight: 50, reps: 12 },
      { setNumber: 2, weight: 60, reps: 6 }
    ]);
  });
});
