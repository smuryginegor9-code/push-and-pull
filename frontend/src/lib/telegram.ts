declare global {
  interface Window {
    __PUSHME_REACT_BOOTED?: boolean;
    TelegramWebviewProxy?: {
      postEvent?: (eventType: string, eventData?: string) => void;
    };
    Telegram?: {
      WebApp?: {
        initData?: string;
        themeParams?: Record<string, string>;
        colorScheme?: "light" | "dark";
        safeAreaInset?: {
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
        };
        contentSafeAreaInset?: {
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
        };
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

type TelegramWebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;
type LegacyExternal = External & {
  notify?: (message: string) => void;
};

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

function postTelegramEvent(eventType: string, eventData: Record<string, unknown> = {}): boolean {
  const encodedData = JSON.stringify(eventData);

  try {
    if (typeof window.TelegramWebviewProxy?.postEvent === "function") {
      window.TelegramWebviewProxy.postEvent(eventType, encodedData);
      return true;
    }
  } catch {
    // Ignore and try legacy bridges.
  }

  try {
    const externalBridge = window.external as LegacyExternal | undefined;
    if (typeof externalBridge?.notify === "function") {
      externalBridge.notify(JSON.stringify({ eventType, eventData }));
      return true;
    }
  } catch {
    // Ignore and try iframe bridge.
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(JSON.stringify({ eventType, eventData }), "*");
      return true;
    }
  } catch {
    // Ignore bridge errors.
  }

  return false;
}

function notifyTelegramIframeReady(): void {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        JSON.stringify({ eventType: "iframe_ready", eventData: { reload_supported: true } }),
        "*"
      );
    }
  } catch {
    // Ignore iframe bridge errors.
  }
}

export function forceTelegramReadyAndExpand(): void {
  notifyTelegramIframeReady();

  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.ready?.();
    webApp.expand?.();
    return;
  }

  postTelegramEvent("web_app_ready");
  postTelegramEvent("web_app_expand");
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
  const contentSafeTop = tgWebApp?.contentSafeAreaInset?.top;
  const safeTop = tgWebApp?.safeAreaInset?.top;
  const topOffset =
    typeof contentSafeTop === "number"
      ? contentSafeTop
      : typeof safeTop === "number"
        ? safeTop + 44
        : tgWebApp
          ? 56
          : 0;

  const root = document.documentElement;
  root.style.setProperty("--surface", params.bg_color ?? "#0f1318");
  root.style.setProperty("--card", params.secondary_bg_color ?? "#171e26");
  root.style.setProperty("--muted", "#222c36");
  root.style.setProperty("--accent", params.button_color ?? "#2dd4bf");
  root.style.setProperty("--success", "#34d399");
  root.style.setProperty("--danger", "#fb7185");
  root.style.setProperty("--text", params.text_color ?? "#ecf2f8");
  root.style.setProperty("--subtle", params.hint_color ?? "#9aa7b5");
  root.style.setProperty("--tg-top-offset", `${Math.max(0, topOffset)}px`);
  forceTelegramReadyAndExpand();
}
