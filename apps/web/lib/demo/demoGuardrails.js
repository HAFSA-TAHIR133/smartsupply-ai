/**
 * Client-Side AI & Input Guardrails for SmartSupply Demo Mode.
 * Enforces zero-trust input validation directly in the browser without
 * exposing server-side policies or processing malicious payloads.
 */

// Malicious prompt injection patterns (direct & indirect overrides)
const PROMPT_INJECTION_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompt|rules|constraints)\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompt|rules|constraints)\b/i,
  /\bforget\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompt|rules|constraints)\b/i,
  /\boverride\s+(all\s+)?(system|safety|security)\s+(rules|guidelines|instructions)\b/i,
  /\byou\s+are\s+now\s+(dan|unfiltered|jailbroken|root|developer\s+mode)\b/i,
  /\bact\s+as\s+(dan|an\s+unfiltered|jailbroken|root)\b/i,
  /\bprint\s+(system\s+prompt|initial\s+prompt|developer\s+instructions)\b/i,
  /\brepeat\s+everything\s+above\b/i,
  /\bshow\s+me\s+your\s+(internal|secret|hidden)\s+(instructions|prompt)\b/i,
  /\bdeveloper\s+mode\s+enabled\b/i,
  /<system>[\s\S]*?<\/system>/i,
  /\[SYSTEM_PROMPT\]/i,
];

// SQL injection & structural database mutation attempts
const SQL_INJECTION_PATTERNS = [
  /\b(union(\s+all)?\s+select)\b/i,
  /\bselect\s+.*\s+from\s+/i,
  /\b(insert\s+into|delete\s+from|drop\s+table|drop\s+database|truncate\s+table|alter\s+table)\b/i,
  /\b(exec|execute)\s*\(/i,
  /\bxp_cmdshell\b/i,
  /;\s*--/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
  /\b(or|and)\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
  /\b(or|and)\s+true\s*=\s*true\b/i,
];

// Cross-Site Scripting (XSS) & Code Execution patterns
const CODE_INJECTION_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<script\b/i,
  /javascript\s*:/i,
  /data:text\/html/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /\beval\s*\(/i,
  /\bdocument\.(cookie|location|write)\b/i,
  /\bwindow\.(location|open)\b/i,
];

// Inappropriate / offensive / abusive language patterns
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|nigger|nigga|faggot|retard)\b/i,
  /\b(kill\s+yourself|die\s+in\s+a\s+fire|bomb|terrorist|suicide)\b/i,
];

/**
 * Validates any user input string against Demo Guardrails.
 * @param {string} input - The natural language or form text input
 * @returns {{ allowed: boolean, error?: string, code?: string, reason?: string }}
 */
export function checkDemoGuardrails(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { allowed: true };
  }

  const clean = input.trim();

  // 1. Prompt Injection Guardrail
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        allowed: false,
        error: "Action rejected by Demo Guardrails",
        code: "GUARDRAIL_PROMPT_INJECTION",
        reason: "Structural prompt injection or instruction override attempt detected.",
      };
    }
  }

  // 2. SQL Injection Guardrail
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        allowed: false,
        error: "Action rejected by Demo Guardrails",
        code: "GUARDRAIL_SQL_INJECTION",
        reason: "SQL syntax or structural database manipulation attempt detected.",
      };
    }
  }

  // 3. Code Injection / XSS Guardrail
  for (const pattern of CODE_INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        allowed: false,
        error: "Action rejected by Demo Guardrails",
        code: "GUARDRAIL_CODE_INJECTION",
        reason: "Potentially harmful executable script or structural markup detected.",
      };
    }
  }

  // 4. Inappropriate / Profanity Guardrail
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        allowed: false,
        error: "Action rejected by Demo Guardrails",
        code: "GUARDRAIL_INAPPROPRIATE_CONTENT",
        reason: "Inappropriate or abusive terminology detected.",
      };
    }
  }

  return { allowed: true };
}
