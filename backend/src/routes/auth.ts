import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/http.js";
import { signAuthToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { verifyTelegramWebAppInitData } from "../lib/telegram.js";

export const authRouter = Router();

const telegramBodySchema = z.object({
  initData: z.string().min(1)
});

authRouter.post(
  "/telegram",
  asyncHandler(async (req, res) => {
    if (!env.TELEGRAM_BOT_TOKEN) {
      res.status(500).json({ error: "TELEGRAM_BOT_TOKEN is not configured" });
      return;
    }

    const { initData } = telegramBodySchema.parse(req.body);
    const { user } = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN, env.AUTH_MAX_AGE_SECONDS);

    const stored = await prisma.user.upsert({
      where: { telegramId: String(user.id) },
      update: {
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null
      },
      create: {
        telegramId: String(user.id),
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null
      }
    });

    const token = signAuthToken({
      userId: stored.id,
      telegramId: stored.telegramId
    });

    res.json({ token, user: stored });
  })
);

const devBodySchema = z.object({
  telegramId: z.string().min(1),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

authRouter.post(
  "/dev",
  asyncHandler(async (req, res) => {
    if (env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = devBodySchema.parse(req.body);

    const stored = await prisma.user.upsert({
      where: { telegramId: body.telegramId },
      update: {
        username: body.username ?? null,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null
      },
      create: {
        telegramId: body.telegramId,
        username: body.username ?? null,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null
      }
    });

    const token = signAuthToken({
      userId: stored.id,
      telegramId: stored.telegramId
    });

    res.json({ token, user: stored });
  })
);
