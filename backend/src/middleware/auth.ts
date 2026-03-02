import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  try {
    req.auth = verifyAuthToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
