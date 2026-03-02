import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { LoadingScreen } from "./components/LoadingScreen";
import { apiRequest } from "./lib/api";
import { getTelegramInitData, initTelegramTheme, waitForTelegramWebApp } from "./lib/telegram";
import { HistoryPage } from "./pages/HistoryPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { TodayPage } from "./pages/TodayPage";
import { WorkoutPage } from "./pages/WorkoutPage";
import type { User } from "./types";

const ProgressPage = lazy(async () => ({
  default: (await import("./pages/ProgressPage")).ProgressPage
}));

type AuthState = {
  token: string;
  user: User;
};

function useAuthState(): { state: AuthState | null; loading: boolean; error: string | null } {
  const [state, setState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      const hardTimeout = window.setTimeout(() => {
        if (!mounted) return;
        setError("Таймаут инициализации Mini App. Проверь HTTPS/IPv6 и открой заново через /start.");
        setLoading(false);
      }, 20000);

      try {
        const webApp = await waitForTelegramWebApp();
        initTelegramTheme(webApp);

        const localToken = localStorage.getItem("pushme-token");
        if (localToken) {
          const me = await apiRequest<User>("/me", { token: localToken });
          if (!mounted) return;
          setState({ token: localToken, user: me });
          setLoading(false);
          return;
        }

        let token = "";
        const initData = getTelegramInitData(webApp);
        if (initData) {
          const auth = await apiRequest<{ token: string; user: User }>("/auth/telegram", {
            method: "POST",
            body: { initData }
          });
          token = auth.token;
        } else if (import.meta.env.DEV) {
          const devTelegramId = import.meta.env.VITE_DEV_TELEGRAM_ID || "10001";
          const auth = await apiRequest<{ token: string; user: User }>("/auth/dev", {
            method: "POST",
            body: {
              telegramId: String(devTelegramId),
              firstName: "Dev"
            }
          });
          token = auth.token;
        } else {
          throw new Error("Нет initData Telegram. Открой Mini App через кнопку в Telegram (/start).");
        }

        const me = await apiRequest<User>("/me", { token });
        if (!mounted) return;

        localStorage.setItem("pushme-token", token);
        setState({ token, user: me });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Auth failed");
      } finally {
        window.clearTimeout(hardTimeout);
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  return { state, loading, error };
}

function AppRoutes({ auth }: { auth: AuthState }): JSX.Element {
  const location = useLocation();
  const hideNav = useMemo(() => false, [location.pathname]);

  return (
    <div className="min-h-screen bg-transparent">
      <Routes>
        <Route path="/" element={<TodayPage token={auth.token} user={auth.user} />} />
        <Route path="/session/:id" element={<WorkoutPage token={auth.token} />} />
        <Route path="/history" element={<HistoryPage token={auth.token} />} />
        <Route path="/leaderboard" element={<LeaderboardPage token={auth.token} user={auth.user} />} />
        <Route
          path="/progress"
          element={(
            <Suspense fallback={<LoadingScreen label="Загружаем прогресс" />}>
              <ProgressPage token={auth.token} />
            </Suspense>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App(): JSX.Element {
  const { state, loading, error } = useAuthState();

  if (loading) {
    return <LoadingScreen label="Подключаем Telegram и загружаем дневник" />;
  }

  if (!state) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <div className="w-full rounded-3xl bg-card p-5 text-center shadow-card">
          <p className="text-base font-semibold text-danger">Ошибка авторизации: {error ?? "Unknown"}</p>
        </div>
      </div>
    );
  }

  return <AppRoutes auth={state} />;
}
