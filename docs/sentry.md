---
title: Sentry Integration
layout: page
nav_order: 95
---

# Sentry Error Tracking

OpenClaw supports optional [Sentry](https://sentry.io) integration for error tracking and monitoring.

## Configuration

Set the following environment variables to enable Sentry:

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Yes | Your Sentry DSN (Data Source Name) |
| `SENTRY_ENVIRONMENT` | No | Environment name (defaults to `NODE_ENV` or "development") |
| `SENTRY_RELEASE` | No | Release version (defaults to package version) |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Performance monitoring sample rate 0-1 (default: 0.1) |
| `SENTRY_SEND_PII` | No | Send personally identifiable information (default: false) |

## Example

```bash
export SENTRY_DSN="https://abc123@sentry.example.com/1"
export SENTRY_ENVIRONMENT="production"
```

## Self-Hosted Sentry

For self-hosted Sentry installations, use the DSN provided by your Sentry instance.

Example for a home server setup:
```bash
export SENTRY_DSN="https://key@sentry.home.example.com/1"
```

## What's Captured

- Unhandled exceptions and promise rejections
- Fatal errors that cause process exit
- Configuration errors

## What's Filtered Out

- AbortError (intentional cancellations)
- Transient network errors (ECONNRESET, ETIMEDOUT, etc.)
- These are expected in distributed systems and don't need tracking

## Programmatic Usage

You can also capture errors and messages programmatically:

```typescript
import { captureException, captureMessage, setTag } from "./infra/sentry.js";

// Capture an error with context
captureException(error, { userId: "123", action: "send_message" });

// Capture a message
captureMessage("Important event occurred", "info");

// Set tags for filtering
setTag("channel", "telegram");
```
