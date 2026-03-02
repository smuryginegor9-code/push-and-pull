import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getAnalyticsSummary,
  getExerciseAnalytics,
  getWeeklyPersonalProgress
} from "../services/analytics.js";

export const analyticsRouter = Router();

const querySchema = z.object({
  period: z.enum(["1m", "3m", "all"]).default("3m"),
  metric: z.enum(["max_weight", "volume", "avg_weight"]).default("max_weight"),
  mode: z.enum(["real", "e1rm"]).default("real")
});
const exerciseParamSchema = z.object({
  exerciseId: z.string().uuid()
});

analyticsRouter.get(
  "/exercise/:exerciseId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { exerciseId } = exerciseParamSchema.parse(req.params);
    const query = querySchema.parse(req.query);

    const points = await getExerciseAnalytics(
      prisma,
      req.auth!.userId,
      exerciseId,
      query.period,
      query.metric,
      query.mode
    );

    res.json(points.map(({ date, value }) => ({ date, value })));
  })
);

analyticsRouter.get(
  "/exercise/:exerciseId/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { exerciseId } = exerciseParamSchema.parse(req.params);
    const query = querySchema.parse(req.query);

    const points = await getExerciseAnalytics(
      prisma,
      req.auth!.userId,
      exerciseId,
      query.period,
      query.metric,
      query.mode
    );

    res.json(getAnalyticsSummary(points));
  })
);

analyticsRouter.get(
  "/weekly-progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getWeeklyPersonalProgress(prisma, req.auth!.userId);
    res.json(data);
  })
);
