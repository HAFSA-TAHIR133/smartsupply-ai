/**
 * SmartSupply AI - Authentication Rate Limiter & Lockout Manager
 * 
 * Rules:
 * - Limit: 10 failed login attempts
 * - Lockout duration: 15 minutes (900,000 ms)
 * - Automatic unlock after 15 minutes
 * - Reset attempts on successful authentication
 */

const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory map of failed attempts: normalizedEmail -> { attempts: number, lockedUntil: number | null, lastAttempt: number }
const loginAttempts = new Map();

/**
 * Normalizes email for key lookup
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

/**
 * Check if the given email is currently locked out
 * @param {string} email
 * @returns {{ isLocked: boolean, remainingMinutes: number, remainingSeconds: number, lockedUntil: number | null, attempts: number }}
 */
export function checkLoginLockout(email) {
  const key = normalizeEmail(email);
  if (!key) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, lockedUntil: null, attempts: 0 };
  }

  const record = loginAttempts.get(key);
  if (!record) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, lockedUntil: null, attempts: 0 };
  }

  const now = Date.now();

  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return {
        isLocked: true,
        remainingMinutes,
        remainingSeconds,
        lockedUntil: record.lockedUntil,
        attempts: record.attempts || MAX_ATTEMPTS,
      };
    } else {
      // Lockout period has elapsed, clear lockout and reset counter
      loginAttempts.delete(key);
      return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, lockedUntil: null, attempts: 0 };
    }
  }

  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    lockedUntil: null,
    attempts: record.attempts || 0,
  };
}

/**
 * Records a failed login attempt for the given email.
 * If 10 failed attempts are reached, locks out for 15 minutes.
 * @param {string} email
 * @returns {{ isLocked: boolean, remainingMinutes: number, remainingSeconds: number, lockedUntil: number | null, attempts: number }}
 */
export function recordFailedLogin(email) {
  const key = normalizeEmail(email);
  if (!key) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, lockedUntil: null, attempts: 0 };
  }

  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record) {
    record = { attempts: 0, lockedUntil: null, lastAttempt: now };
  }

  // If previous attempt was more than 15 minutes ago and account was not locked, reset attempts
  if (!record.lockedUntil && record.lastAttempt && (now - record.lastAttempt > LOCKOUT_DURATION_MS)) {
    record.attempts = 0;
  }

  record.attempts = (record.attempts || 0) + 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttempts.set(key, record);
    return {
      isLocked: true,
      remainingMinutes: 15,
      remainingSeconds: 15 * 60,
      lockedUntil: record.lockedUntil,
      attempts: record.attempts,
    };
  }

  loginAttempts.set(key, record);
  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    lockedUntil: null,
    attempts: record.attempts,
  };
}

/**
 * Resets failed login attempts for an email upon successful login
 * @param {string} email
 */
export function recordSuccessfulLogin(email) {
  const key = normalizeEmail(email);
  if (key) {
    loginAttempts.delete(key);
  }
}

/**
 * Clears all login lockout data (for testing & resets)
 */
export function clearAllLoginAttempts() {
  loginAttempts.clear();
}
