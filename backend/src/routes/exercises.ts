import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const exercisesRouter = Router();

const createExerciseSchema = z.object({
  name: z.string().min(1),
  defaultSets: z.coerce.number().int().min(0).max(12).default(4),
  muscleGroup: z.string().optional().nullable()
});

exercisesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = String(req.query.q ?? "").trim();

    const exercises = await prisma.exercise.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: "insensitive"
            }
          }
        : undefined,
      orderBy: { name: "asc" },
      take: 50
    });

    res.json(exercises);
  })
);

exercisesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createExerciseSchema.parse(req.body);

    const existing = await prisma.exercise.findUnique({
      where: { name: body.name }
    });

    if (existing) {
      res.json(existing);
      return;
    }

    const created = await prisma.exercise.create({
      data: {
        name: body.name,
        defaultSets: body.defaultSets,
        muscleGroup: body.muscleGroup ?? null
      }
    });

    res.status(201).json(created);
  })
);
