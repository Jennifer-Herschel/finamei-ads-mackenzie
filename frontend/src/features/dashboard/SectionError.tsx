type SectionErrorProps = {
  message: string
  onRetry: () => void
}

export function SectionError({ message, onRetry }: SectionErrorProps) {
  return (
    <div role="alert" className="space-y-3">
      <p className="text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Tentar novamente
      </button>
    </div>
  )
}
