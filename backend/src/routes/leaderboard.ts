import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateLeaderboardRows } from "../services/leaderboard.js";
import { parseIsoWeek } from "../services/week.js";

export const leaderboardRouter = Router();

leaderboardRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const week = req.query.week ? String(req.query.week) : undefined;
    const range = parseIsoWeek(week);

    let groupId = req.query.groupId ? String(req.query.groupId) : undefined;

    if (!groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: { userId: req.auth!.userId }
      });
      groupId = membership?.groupId;
    }

    if (!groupId) {
      res.json({
        week: range.label,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        rows: []
      });
      return;
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true }
    });

    const memberUserIds = members.map((member) => member.userId);

    const setLogs = await prisma.setLog.findMany({
      where: {
        exerciseLog: {
          session: {
            userId: { in: memberUserIds },
            startedAt: {
              gte: range.start,
              lte: range.end
            }
          }
        }
      },
      include: {
        exerciseLog: {
          include: {
            session: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    const rows = calculateLeaderboardRows(
      setLogs.map((setLog) => ({
        userId: setLog.exerciseLog.session.userId,
        userName:
          setLog.exerciseLog.session.user.firstName ||
          setLog.exerciseLog.session.user.username ||
          `user_${setLog.exerciseLog.session.user.telegramId}`,
        sessionId: setLog.exerciseLog.sessionId,
        weight: Number(setLog.weight),
        reps: setLog.reps
      }))
    );

    res.json({
      week: range.label,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      rows
    });
  })
);
