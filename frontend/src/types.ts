export type User = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  defaultSets: number;
  muscleGroup: string | null;
  createdAt?: string;
};

export type TemplateExercise = {
  id: string;
  templateId: string;
  exerciseId: string;
  orderIndex: number;
  enabled: boolean;
  exercise: Exercise;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  orderIndex: number;
  templateEntries: TemplateExercise[];
};

export type SetLog = {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weight: number;
  reps: number;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  comment: string | null;
  exercise: Exercise;
  setLogs: SetLog[];
};

export type WorkoutSession = {
  id: string;
  userId: string;
  templateId: string | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  exerciseLogs: ExerciseLog[];
};

export type Group = {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    groupId: string;
    role: string;
    user: User;
  }>;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  totalVolume: number;
  workouts: number;
};
