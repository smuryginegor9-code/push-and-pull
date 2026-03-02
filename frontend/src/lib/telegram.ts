declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        themeParams?: Record<string, string>;
        colorScheme?: "light" | "dark";
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

type TelegramWebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

function getHashParam(name: string): string | null {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;
  return new URLSearchParams(hash).get(name);
}

export function getTelegramInitData(webApp?: TelegramWebApp): string | null {
  const fromWebApp = webApp?.initData?.trim();
  if (fromWebApp) return fromWebApp;

  const fromSearch = new URLSearchParams(window.location.search).get("tgWebAppData")?.trim();
  if (fromSearch) return fromSearch;

  const fromHash = getHashParam("tgWebAppData")?.trim();
  return fromHash || null;
}

export async function waitForTelegramWebApp(timeoutMs = 3000, stepMs = 100): Promise<TelegramWebApp | undefined> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const webApp = getTelegramWebApp();
    if (webApp) return webApp;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, stepMs);
    });
  }

  return getTelegramWebApp();
}

export function initTelegramTheme(webApp?: TelegramWebApp): void {
  const tgWebApp = webApp ?? getTelegramWebApp();
  const params = tgWebApp?.themeParams ?? {};

  const root = document.documentElement;
  root.style.setProperty("--surface", params.bg_color ?? "#0f1318");
  root.style.setProperty("--card", params.secondary_bg_color ?? "#171e26");
  root.style.setProperty("--muted", "#222c36");
  root.style.setProperty("--accent", params.button_color ?? "#2dd4bf");
  root.style.setProperty("--success", "#34d399");
  root.style.setProperty("--danger", "#fb7185");
  root.style.setProperty("--text", params.text_color ?? "#ecf2f8");
  root.style.setProperty("--subtle", params.hint_color ?? "#9aa7b5");

  tgWebApp?.ready?.();
  tgWebApp?.expand?.();
}
