import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const templateExercisesRouter = Router();

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  orderIndex: z.coerce.number().int().min(0).optional()
});

templateExercisesRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = patchSchema.parse(req.body);

    const updated = await prisma.templateExercise.update({
      where: { id: req.params.id },
      data: {
        enabled: body.enabled,
        orderIndex: body.orderIndex
      },
      include: {
        exercise: true,
        template: true
      }
    });

    res.json(updated);
  })
);

const createSchema = z.object({
  templateId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  orderIndex: z.coerce.number().int().min(0).optional(),
  enabled: z.boolean().default(true)
});

templateExercisesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const created = await prisma.$transaction(async (tx) => {
      const currentMax = await tx.templateExercise.aggregate({
        where: { templateId: body.templateId },
        _max: { orderIndex: true }
      });

      return tx.templateExercise.upsert({
        where: {
          templateId_exerciseId: {
            templateId: body.templateId,
            exerciseId: body.exerciseId
          }
        },
        create: {
          templateId: body.templateId,
          exerciseId: body.exerciseId,
          enabled: body.enabled,
          orderIndex: body.orderIndex ?? (currentMax._max.orderIndex ?? -1) + 1
        },
        update: {
          enabled: body.enabled,
          orderIndex: body.orderIndex
        },
        include: {
          exercise: true
        }
      });
    });

    res.status(201).json(created);
  })
);
