import { loadMatrixSdk } from "../sdk-runtime.js";

let matrixSdkLoggingConfigured = false;
let matrixSdkBaseLogger:
  | {
      trace: (module: string, ...messageOrObject: unknown[]) => void;
      debug: (module: string, ...messageOrObject: unknown[]) => void;
      info: (module: string, ...messageOrObject: unknown[]) => void;
      warn: (module: string, ...messageOrObject: unknown[]) => void;
      error: (module: string, ...messageOrObject: unknown[]) => void;
    }
  | undefined;
let matrixUnknownTokenRestartScheduled = false;
let exitProcess: (code: number) => void = (code) => {
  process.exit(code);
};

function shouldSuppressMatrixHttpNotFound(module: string, messageOrObject: unknown[]): boolean {
  if (module !== "MatrixHttpClient") {
    return false;
  }
  return messageOrObject.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return (entry as { errcode?: string }).errcode === "M_NOT_FOUND";
  });
}

function isMatrixUnknownToken(module: string, messageOrObject: unknown[]): boolean {
  if (module !== "MatrixHttpClient") {
    return false;
  }
  return messageOrObject.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return (entry as { errcode?: string }).errcode === "M_UNKNOWN_TOKEN";
  });
}

function scheduleRestartForUnknownToken(): void {
  if (matrixUnknownTokenRestartScheduled) {
    return;
  }
  matrixUnknownTokenRestartScheduled = true;
  matrixSdkBaseLogger?.error(
    "MatrixClientLite",
    "Matrix access token became invalid during runtime; exiting so startup can re-auth cleanly",
  );
  setTimeout(() => exitProcess(75), 0);
}

export function ensureMatrixSdkLoggingConfigured(): void {
  if (matrixSdkLoggingConfigured) {
    return;
  }
  const { ConsoleLogger, LogService } = loadMatrixSdk();
  matrixSdkBaseLogger = new ConsoleLogger();
  matrixSdkLoggingConfigured = true;

  LogService.setLogger({
    trace: (module, ...messageOrObject) => matrixSdkBaseLogger?.trace(module, ...messageOrObject),
    debug: (module, ...messageOrObject) => matrixSdkBaseLogger?.debug(module, ...messageOrObject),
    info: (module, ...messageOrObject) => matrixSdkBaseLogger?.info(module, ...messageOrObject),
    warn: (module, ...messageOrObject) => matrixSdkBaseLogger?.warn(module, ...messageOrObject),
    error: (module, ...messageOrObject) => {
      if (shouldSuppressMatrixHttpNotFound(module, messageOrObject)) {
        return;
      }
      if (isMatrixUnknownToken(module, messageOrObject)) {
        scheduleRestartForUnknownToken();
      }
      matrixSdkBaseLogger?.error(module, ...messageOrObject);
    },
  });
}

export function __setMatrixUnknownTokenExitForTests(fn: (code: number) => void): void {
  exitProcess = fn;
}

export function __resetMatrixSdkLoggingForTests(): void {
  matrixSdkLoggingConfigured = false;
  matrixSdkBaseLogger = undefined;
  matrixUnknownTokenRestartScheduled = false;
  exitProcess = (code) => {
    process.exit(code);
  };
}
