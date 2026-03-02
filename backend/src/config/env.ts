import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  FRONTEND_ORIGIN: z.string().default("*"),
  AUTH_MAX_AGE_SECONDS: z.coerce.number().default(86400)
});

export const env = envSchema.parse(process.env);
