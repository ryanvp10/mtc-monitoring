// Phase 1. NOTE: this is a convenience gate for shared PCs, not real security.
// The PIN protects against casual mix-ups between profiles; document that in the README.
const enc = new TextEncoder()

const toHex = (buf: ArrayBufferLike) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin)

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
}

// Comfortably above 100k, still fast enough on a factory laptop (~50 ms on modern hardware).
const PBKDF2_ITERATIONS = 210_000

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

/** Constant-time string comparison (no early exit on the first mismatching character). */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  return constantTimeEqual(await hashPin(pin, salt), expectedHash)
}
