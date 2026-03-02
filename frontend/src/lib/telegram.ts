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

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function initTelegramTheme(): void {
  const webApp = getTelegramWebApp();
  const params = webApp?.themeParams ?? {};

  const root = document.documentElement;
  root.style.setProperty("--surface", params.bg_color ?? "#0f1318");
  root.style.setProperty("--card", params.secondary_bg_color ?? "#171e26");
  root.style.setProperty("--muted", "#222c36");
  root.style.setProperty("--accent", params.button_color ?? "#2dd4bf");
  root.style.setProperty("--success", "#34d399");
  root.style.setProperty("--danger", "#fb7185");
  root.style.setProperty("--text", params.text_color ?? "#ecf2f8");
  root.style.setProperty("--subtle", params.hint_color ?? "#9aa7b5");

  webApp?.ready?.();
  webApp?.expand?.();
}
