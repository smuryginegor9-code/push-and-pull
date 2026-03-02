import dotenv from "dotenv";
import { Markup, Telegraf } from "telegraf";

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

if (!token) {
  throw new Error("BOT_TOKEN is required");
}

if (!webAppUrl) {
  throw new Error("WEB_APP_URL is required");
}

const bot = new Telegraf(token);
let isRunning = false;

bot.start(async (ctx) => {
  await ctx.reply(
    "Открывай Push Me и логируй тренировку за пару тапов.",
    Markup.inlineKeyboard([
      Markup.button.webApp("Открыть дневник", webAppUrl)
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
    console.log("Bot started");
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
