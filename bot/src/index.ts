import dotenv from "dotenv";
import { Markup, Telegraf } from "telegraf";

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrlRaw = process.env.WEB_APP_URL;
const webAppVersion = process.env.WEB_APP_VERSION || `${Date.now()}`;

if (!token) {
  throw new Error("BOT_TOKEN is required");
}

if (!webAppUrlRaw) {
  throw new Error("WEB_APP_URL is required");
}

const webAppUrl = webAppUrlRaw;

function getVersionedWebAppUrl(): string {
  const url = new URL(webAppUrl);
  if (!url.searchParams.has("v")) {
    url.searchParams.set("v", webAppVersion);
  }
  return url.toString();
}

const bot = new Telegraf(token);
let isRunning = false;

bot.start(async (ctx) => {
  await ctx.reply(
    "Открывай Push Me и логируй тренировку за пару тапов.",
    Markup.inlineKeyboard([
      Markup.button.webApp("Открыть дневник", getVersionedWebAppUrl())
    ])
  );
});

bot.catch((error) => {
  console.error("Bot update error:", error);
});

async function main(): Promise<void> {
  try {
    const webhookInfo = await bot.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      await bot.telegram.deleteWebhook();
      console.log("Existing webhook removed. Using long polling mode.");
    }

    await bot.launch();
    isRunning = true;
    console.log("Bot started with WebApp URL:", getVersionedWebAppUrl());
  } catch (error) {
    console.error("Bot launch failed:", error);
    process.exit(1);
  }
}

function shutdown(signal: "SIGINT" | "SIGTERM"): void {
  if (isRunning) {
    bot.stop(signal);
  }
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

void main();
