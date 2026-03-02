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

bot.start(async (ctx) => {
  await ctx.reply(
    "Открывай Push Me и логируй тренировку за пару тапов.",
    Markup.inlineKeyboard([
      Markup.button.webApp("Открыть дневник", webAppUrl)
    ])
  );
});

bot.launch().then(() => {
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
