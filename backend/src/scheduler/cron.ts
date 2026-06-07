import { getNextSendAt, runScheduler } from './runner.js'

const MAX_WAKE_MS = 24 * 60 * 60 * 1000

let safetyTimer: ReturnType<typeof setInterval> | null = null
let wakeTimer: ReturnType<typeof setTimeout> | null = null
let running = false

function safetyIntervalMs (): number {
  const seconds = Number(process.env.SCHEDULER_CRON_SECONDS ?? 30)
  return Math.max(10, Math.min(seconds, 300)) * 1000
}

async function scheduleNextWake (): Promise<void> {
  if (wakeTimer) {
    clearTimeout(wakeTimer)
    wakeTimer = null
  }

  const next = await getNextSendAt()
  if (!next) return

  const delay = Math.max(0, next.getTime() - Date.now())
  const actualDelay = Math.min(delay, MAX_WAKE_MS)

  wakeTimer = setTimeout(() => {
    void tick()
  }, actualDelay)
}

async function tick (): Promise<void> {
  if (running) return
  running = true
  try {
    const result = await runScheduler()
    if (result.messages_sent > 0 || result.subscriptions_completed > 0) {
      console.log('[scheduler]', result)
    }
  } catch (err) {
    console.error('[scheduler] failed', err)
  } finally {
    running = false
    await scheduleNextWake()
  }
}

export function startSchedulerCron (): void {
  const enabled = process.env.SCHEDULER_CRON_ENABLED !== 'false'
  if (!enabled) {
    console.log('Campaign Auto Scheduler: disabled (SCHEDULER_CRON_ENABLED=false)')
    return
  }

  const seconds = safetyIntervalMs() / 1000
  void tick()
  safetyTimer = setInterval(() => {
    void tick()
  }, safetyIntervalMs())

  console.log(
    `Campaign Auto Scheduler: sends at exact send date + safety check every ${seconds}s (backend — not n8n)`
  )
}

export function stopSchedulerCron (): void {
  if (safetyTimer) {
    clearInterval(safetyTimer)
    safetyTimer = null
  }
  if (wakeTimer) {
    clearTimeout(wakeTimer)
    wakeTimer = null
  }
}

/** Call after subscription save so overdue / just-due sends fire without waiting. */
export function triggerSchedulerCheck (): void {
  void tick()
}
