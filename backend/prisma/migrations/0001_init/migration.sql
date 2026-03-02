CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "telegramId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

CREATE TABLE "WorkoutTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutTemplate_name_key" ON "WorkoutTemplate"("name");

CREATE TABLE "Exercise" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "defaultSets" INTEGER NOT NULL DEFAULT 4,
  "muscleGroup" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

CREATE TABLE "TemplateExercise" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "templateId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "TemplateExercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateExercise_templateId_exerciseId_key" ON "TemplateExercise"("templateId", "exerciseId");
CREATE INDEX "TemplateExercise_templateId_orderIndex_idx" ON "TemplateExercise"("templateId", "orderIndex");

CREATE TABLE "WorkoutSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "templateId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

CREATE TABLE "ExerciseLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "comment" TEXT,
  CONSTRAINT "ExerciseLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseLog_sessionId_exerciseId_key" ON "ExerciseLog"("sessionId", "exerciseId");
CREATE INDEX "ExerciseLog_sessionId_orderIndex_idx" ON "ExerciseLog"("sessionId", "orderIndex");

CREATE TABLE "SetLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "exerciseLogId" TEXT NOT NULL,
  "setNumber" INTEGER NOT NULL,
  "weight" DECIMAL(8,2) NOT NULL,
  "reps" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SetLog_exerciseLogId_setNumber_key" ON "SetLog"("exerciseLogId", "setNumber");
CREATE INDEX "SetLog_createdAt_idx" ON "SetLog"("createdAt");

CREATE TABLE "Group" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

CREATE TABLE "GroupMember" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "ExerciseLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
