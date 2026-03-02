import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Сегодня" },
  { to: "/history", label: "История" },
  { to: "/leaderboard", label: "Рейтинг" },
  { to: "/progress", label: "Прогресс" }
];

export function BottomNav(): JSX.Element {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-card/95 backdrop-blur px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-2xl px-2 py-3 text-center text-sm font-semibold transition ${
                isActive ? "bg-accent text-slate-900" : "bg-white/5 text-subtle"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
