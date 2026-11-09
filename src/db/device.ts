const KEY = 'mtc01.device_id'

/** Stable per-browser id, used to show where a record was last written. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // storage blocked (private mode etc.): fall back to a per-session id
    return 'session-' + crypto.randomUUID()
  }
}
