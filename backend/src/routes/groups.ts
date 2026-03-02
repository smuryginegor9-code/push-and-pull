import { randomBytes } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const groupsRouter = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

const createGroupSchema = z.object({
  name: z.string().min(2).max(80)
});

groupsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createGroupSchema.parse(req.body);

    const group = await prisma.$transaction(async (tx) => {
      let inviteCode = generateInviteCode();

      // Retry on collisions
      for (let i = 0; i < 3; i += 1) {
        const exists = await tx.group.findUnique({ where: { inviteCode } });
        if (!exists) break;
        inviteCode = generateInviteCode();
      }

      const created = await tx.group.create({
        data: {
          name: body.name,
          inviteCode
        }
      });

      await tx.groupMember.create({
        data: {
          groupId: created.id,
          userId: req.auth!.userId,
          role: "admin"
        }
      });

      return created;
    });

    res.status(201).json(group);
  })
);

const joinSchema = z.object({
  code: z.string().min(4)
});

groupsRouter.post(
  "/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = joinSchema.parse(req.body);

    const group = await prisma.group.findUnique({
      where: { inviteCode: body.code.toUpperCase() }
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const member = await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: req.auth!.userId
        }
      },
      update: {},
      create: {
        groupId: group.id,
        userId: req.auth!.userId,
        role: "member"
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    res.json(member.group);
  })
);

groupsRouter.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: req.auth!.userId
      },
      include: {
        group: {
          include: {
            members: {
              include: { user: true }
            }
          }
        }
      }
    });

    res.json(membership?.group ?? null);
  })
);
