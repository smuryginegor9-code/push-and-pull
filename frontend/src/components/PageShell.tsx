import type { PropsWithChildren } from "react";

export function PageShell({ title, actions, children }: PropsWithChildren<{ title: string; actions?: JSX.Element }>): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-3 pb-28 pt-4">
      <header className="rounded-3xl bg-gradient-to-br from-accent/25 via-teal-300/5 to-sky-300/10 p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">{title}</h1>
          {actions}
        </div>
      </header>
      {children}
    </div>
  );
}
