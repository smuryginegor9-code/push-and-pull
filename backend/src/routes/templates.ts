import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const templatesRouter = Router();

templatesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const templates = await prisma.workoutTemplate.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        templateEntries: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: true
          }
        }
      }
    });

    res.json(templates);
  })
);
