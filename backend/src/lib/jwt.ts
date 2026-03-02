import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthTokenPayload = {
  userId: string;
  telegramId: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
