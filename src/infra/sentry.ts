/**
 * Sentry error tracking integration
 *
 * This module provides optional Sentry integration for error tracking.
 * Set SENTRY_DSN environment variable to enable.
 */

import * as Sentry from "@sentry/node";

let initialized = false;

/**
 * Initialize Sentry if SENTRY_DSN is configured.
 * Safe to call multiple times - will only initialize once.
 */
export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
  const release = process.env.SENTRY_RELEASE || process.env.npm_package_version;

  Sentry.init({
    dsn,
    environment,
    release: release ? `openclaw@${release}` : undefined,

    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

    // Don't send PII by default
    sendDefaultPii: process.env.SENTRY_SEND_PII === "true",

    // Capture unhandled promise rejections
    integrations: [Sentry.onUnhandledRejectionIntegration({ mode: "warn" })],

    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Don't report AbortError (intentional cancellations)
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }

      // Don't report transient network errors
      if (error instanceof Error) {
        const code = (error as { code?: string }).code;
        const transientCodes = [
          "ECONNRESET",
          "ECONNREFUSED",
          "ENOTFOUND",
          "ETIMEDOUT",
          "ESOCKETTIMEDOUT",
          "ECONNABORTED",
          "EPIPE",
          "EHOSTUNREACH",
          "ENETUNREACH",
          "EAI_AGAIN",
        ];
        if (code && transientCodes.includes(code)) {
          return null;
        }
      }

      return event;
    },
  });

  initialized = true;
  console.log("[openclaw] Sentry initialized for error tracking");
}

/**
 * Check if Sentry is initialized
 */
export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Capture an exception to Sentry
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): string | undefined {
  if (!initialized) return undefined;

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
): string | undefined {
  if (!initialized) return undefined;

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  if (!initialized) return;

  Sentry.setUser(user);
}

/**
 * Set extra context for Sentry
 */
export function setContext(name: string, context: Record<string, unknown> | null): void {
  if (!initialized) return;

  Sentry.setContext(name, context);
}

/**
 * Set a tag for Sentry
 */
export function setTag(key: string, value: string): void {
  if (!initialized) return;

  Sentry.setTag(key, value);
}

/**
 * Flush pending Sentry events (call before process exit)
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!initialized) return true;

  return Sentry.flush(timeout);
}

/**
 * Close Sentry client (call on graceful shutdown)
 */
export async function closeSentry(timeout = 2000): Promise<boolean> {
  if (!initialized) return true;

  return Sentry.close(timeout);
}
