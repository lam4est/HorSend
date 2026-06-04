type ApiAlertProps = {
  variant: 'error' | 'warning'
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export default function ApiAlert ({ variant, message, onRetry, retryLabel = 'Retry' }: ApiAlertProps) {
  return (
    <div className={`api-alert api-alert--${variant}`} role="alert">
      <p className="api-alert__message">{message}</p>
      {onRetry ? (
        <button type="button" className="api-alert__retry" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
