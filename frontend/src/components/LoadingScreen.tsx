export function LoadingScreen({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
        <p className="text-base font-semibold text-text">{label}</p>
      </div>
    </div>
  );
}
