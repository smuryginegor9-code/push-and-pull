import type { ExerciseLog, Prisma, SetLog, WorkoutSession } from "@prisma/client";

type SessionWithLogs = WorkoutSession & {
  exerciseLogs: Array<
    ExerciseLog & {
      exercise: {
        id: string;
        name: string;
        defaultSets: number;
        muscleGroup: string | null;
      };
      setLogs: SetLog[];
    }
  >;
};

export function serializeSession(session: SessionWithLogs): {
  id: string;
  userId: string;
  templateId: string | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  exerciseLogs: Array<{
    id: string;
    sessionId: string;
    exerciseId: string;
    orderIndex: number;
    comment: string | null;
    exercise: {
      id: string;
      name: string;
      defaultSets: number;
      muscleGroup: string | null;
    };
    setLogs: Array<{
      id: string;
      exerciseLogId: string;
      setNumber: number;
      weight: number;
      reps: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
} {
  return {
    id: session.id,
    userId: session.userId,
    templateId: session.templateId,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    notes: session.notes,
    exerciseLogs: session.exerciseLogs
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((log) => ({
        id: log.id,
        sessionId: log.sessionId,
        exerciseId: log.exerciseId,
        orderIndex: log.orderIndex,
        comment: log.comment,
        exercise: log.exercise,
        setLogs: log.setLogs
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((setLog) => ({
            id: setLog.id,
            exerciseLogId: setLog.exerciseLogId,
            setNumber: setLog.setNumber,
            weight: Number((setLog.weight as Prisma.Decimal).toString()),
            reps: setLog.reps,
            createdAt: setLog.createdAt.toISOString(),
            updatedAt: setLog.updatedAt.toISOString()
          }))
      }))
  };
}
