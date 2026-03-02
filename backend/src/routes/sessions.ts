import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeSession } from "../services/serialize.js";

export const sessionsRouter = Router();

const startSessionSchema = z.object({
  templateId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional()
});

sessionsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = startSessionSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.workoutSession.create({
        data: {
          userId: req.auth!.userId,
          templateId: body.templateId ?? null,
          notes: body.notes ?? null
        }
      });

      if (body.templateId) {
        const templateExercises = await tx.templateExercise.findMany({
          where: { templateId: body.templateId, enabled: true },
          orderBy: { orderIndex: "asc" }
        });

        if (templateExercises.length > 0) {
          await tx.exerciseLog.createMany({
            data: templateExercises.map((entry) => ({
              sessionId: session.id,
              exerciseId: entry.exerciseId,
              orderIndex: entry.orderIndex
            }))
          });
        }
      }

      return tx.workoutSession.findUniqueOrThrow({
        where: { id: session.id },
        include: {
          exerciseLogs: {
            include: {
              exercise: true,
              setLogs: {
                orderBy: { setNumber: "asc" }
              }
            },
            orderBy: { orderIndex: "asc" }
          }
        }
      });
    });

    res.status(201).json(serializeSession(result));
  })
);

sessionsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: req.auth!.userId,
        ...(from || to
          ? {
              startedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: { startedAt: "desc" },
      include: {
        exerciseLogs: {
          include: {
            exercise: true,
            setLogs: {
              orderBy: { setNumber: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    res.json(sessions.map(serializeSession));
  })
);

sessionsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.workoutSession.findFirst({
      where: {
        id: req.params.id,
        userId: req.auth!.userId
      },
      include: {
        exerciseLogs: {
          include: {
            exercise: true,
            setLogs: {
              orderBy: { setNumber: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(serializeSession(session));
  })
);

const updateSessionSchema = z.object({
  endedAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional()
});

sessionsRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = updateSessionSchema.parse(req.body);

    const existing = await prisma.workoutSession.findFirst({
      where: {
        id: req.params.id,
        userId: req.auth!.userId
      }
    });

    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const updated = await prisma.workoutSession.update({
      where: { id: existing.id },
      data: {
        endedAt: body.endedAt === undefined ? undefined : body.endedAt ? new Date(body.endedAt) : null,
        notes: body.notes === undefined ? undefined : body.notes
      },
      include: {
        exerciseLogs: {
          include: {
            exercise: true,
            setLogs: {
              orderBy: { setNumber: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    res.json(serializeSession(updated));
  })
);

const sessionExerciseParams = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid()
});

const addExerciseSchema = z.object({
  orderIndex: z.coerce.number().int().min(0).optional(),
  comment: z.string().nullable().optional()
});

sessionsRouter.post(
  "/:id/exercises/:exerciseId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = sessionExerciseParams.parse(req.params);
    const body = addExerciseSchema.parse(req.body);

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: params.id,
        userId: req.auth!.userId
      }
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.exerciseLog.aggregate({
        where: { sessionId: session.id },
        _max: { orderIndex: true }
      });

      return tx.exerciseLog.upsert({
        where: {
          sessionId_exerciseId: {
            sessionId: session.id,
            exerciseId: params.exerciseId
          }
        },
        create: {
          sessionId: session.id,
          exerciseId: params.exerciseId,
          orderIndex: body.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
          comment: body.comment ?? null
        },
        update: {
          orderIndex: body.orderIndex,
          comment: body.comment
        },
        include: {
          exercise: true,
          setLogs: {
            orderBy: { setNumber: "asc" }
          }
        }
      });
    });

    res.status(201).json({
      ...result,
      setLogs: result.setLogs.map((setLog) => ({
        ...setLog,
        weight: Number(setLog.weight)
      }))
    });
  })
);

sessionsRouter.post(
  "/:id/exercises/:exerciseId/copy-last",
  requireAuth,
  asyncHandler(async (req, res) => {
    const params = sessionExerciseParams.parse(req.params);

    const currentSession = await prisma.workoutSession.findFirst({
      where: {
        id: params.id,
        userId: req.auth!.userId
      }
    });

    if (!currentSession) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const previous = await prisma.exerciseLog.findFirst({
      where: {
        exerciseId: params.exerciseId,
        session: {
          userId: req.auth!.userId,
          startedAt: { lt: currentSession.startedAt }
        },
        setLogs: { some: {} }
      },
      include: {
        setLogs: {
          orderBy: { setNumber: "asc" }
        }
      },
      orderBy: {
        session: {
          startedAt: "desc"
        }
      }
    });

    if (!previous) {
      res.status(404).json({ error: "Previous workout for this exercise not found" });
      return;
    }

    const copied = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.exerciseLog.aggregate({
        where: { sessionId: currentSession.id },
        _max: { orderIndex: true }
      });

      const current = await tx.exerciseLog.upsert({
        where: {
          sessionId_exerciseId: {
            sessionId: currentSession.id,
            exerciseId: params.exerciseId
          }
        },
        create: {
          sessionId: currentSession.id,
          exerciseId: params.exerciseId,
          orderIndex: (maxOrder._max.orderIndex ?? -1) + 1
        },
        update: {}
      });

      await Promise.all(
        previous.setLogs.map((setLog) =>
          tx.setLog.upsert({
            where: {
              exerciseLogId_setNumber: {
                exerciseLogId: current.id,
                setNumber: setLog.setNumber
              }
            },
            create: {
              exerciseLogId: current.id,
              setNumber: setLog.setNumber,
              weight: setLog.weight,
              reps: setLog.reps
            },
            update: {
              weight: setLog.weight,
              reps: setLog.reps
            }
          })
        )
      );

      return tx.exerciseLog.findUniqueOrThrow({
        where: { id: current.id },
        include: {
          exercise: true,
          setLogs: {
            orderBy: { setNumber: "asc" }
          }
        }
      });
    });

    res.json({
      ...copied,
      setLogs: copied.setLogs.map((setLog) => ({
        ...setLog,
        weight: Number(setLog.weight)
      }))
    });
  })
);
