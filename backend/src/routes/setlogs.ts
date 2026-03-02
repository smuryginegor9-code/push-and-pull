import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const setlogsRouter = Router();

const numberField = z.union([z.coerce.number(), z.string()]).transform((value) => Number(value));

const upsertSetSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.coerce.number().int().min(1).max(30),
  weight: numberField.refine((value) => Number.isFinite(value) && value >= 0, "Invalid weight"),
  reps: z.coerce.number().int().min(0).max(100)
});

setlogsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = upsertSetSchema.parse(req.body);

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: body.sessionId,
        userId: req.auth!.userId
      }
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingLog = await tx.exerciseLog.findUnique({
        where: {
          sessionId_exerciseId: {
            sessionId: body.sessionId,
            exerciseId: body.exerciseId
          }
        }
      });

      const exerciseLog = existingLog
        ? existingLog
        : await tx.exerciseLog.create({
            data: {
              sessionId: body.sessionId,
              exerciseId: body.exerciseId,
              orderIndex: 999
            }
          });

      return tx.setLog.upsert({
        where: {
          exerciseLogId_setNumber: {
            exerciseLogId: exerciseLog.id,
            setNumber: body.setNumber
          }
        },
        create: {
          exerciseLogId: exerciseLog.id,
          setNumber: body.setNumber,
          weight: body.weight,
          reps: body.reps
        },
        update: {
          weight: body.weight,
          reps: body.reps
        }
      });
    });

    res.status(201).json({
      ...result,
      weight: Number(result.weight)
    });
  })
);

const deleteSetSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.coerce.number().int().min(1)
});

setlogsRouter.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = deleteSetSchema.parse(req.body);

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: body.sessionId,
        userId: req.auth!.userId
      }
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const exerciseLog = await prisma.exerciseLog.findUnique({
      where: {
        sessionId_exerciseId: {
          sessionId: body.sessionId,
          exerciseId: body.exerciseId
        }
      }
    });

    if (!exerciseLog) {
      res.status(404).json({ error: "Exercise log not found" });
      return;
    }

    await prisma.setLog.deleteMany({
      where: {
        exerciseLogId: exerciseLog.id,
        setNumber: body.setNumber
      }
    });

    res.status(204).send();
  })
);
