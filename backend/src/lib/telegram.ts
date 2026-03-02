import { createHmac, timingSafeEqual } from "crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type VerifiedInitData = {
  user: TelegramWebAppUser;
  authDate: number;
};

function buildDataCheckString(initData: URLSearchParams): string {
  return [...initData.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function verifyTelegramWebAppInitData(input: string, botToken: string, maxAgeSeconds = 86400): VerifiedInitData {
  const params = new URLSearchParams(input);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Init data hash is missing");
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (hashBuffer.length !== expectedBuffer.length || !timingSafeEqual(hashBuffer, expectedBuffer)) {
    throw new Error("Invalid Telegram initData signature");
  }

  const authDate = Number(params.get("auth_date") ?? "0");
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > maxAgeSeconds) {
    throw new Error("Telegram initData expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("Telegram initData has no user payload");
  }

  const user = JSON.parse(userRaw) as TelegramWebAppUser;
  if (!user?.id) {
    throw new Error("Telegram user payload is invalid");
  }

  return { user, authDate };
}
