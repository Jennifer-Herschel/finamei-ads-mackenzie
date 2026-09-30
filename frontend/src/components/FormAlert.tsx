import { useEffect, useRef, type ReactNode } from 'react'

type FormAlertProps = {
  tone: 'error' | 'success'
  children: ReactNode
}

const toneClass = {
  error: 'bg-red-50 text-red-800',
  success: 'bg-emerald-50 text-emerald-900',
}

/**
 * Message about the whole form (not a single field). Errors take the focus so
 * keyboard and screen reader users notice them right away (ONF01).
 */
export function FormAlert({ tone, children }: FormAlertProps) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (tone === 'error') ref.current?.focus()
  }, [tone, children])

  return (
    <p
      ref={ref}
      role={tone === 'error' ? 'alert' : 'status'}
      tabIndex={tone === 'error' ? -1 : undefined}
      className={`rounded-lg px-4 py-3 text-sm outline-none ${toneClass[tone]}`}
    >
      {children}
    </p>
  )
}
