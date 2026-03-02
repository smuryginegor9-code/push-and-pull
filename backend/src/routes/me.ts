import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: {
        memberships: {
          include: {
            group: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      ...user,
      groups: user.memberships.map((member) => member.group)
    });
  })
);
