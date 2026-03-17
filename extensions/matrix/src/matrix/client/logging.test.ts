import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMatrixBotSdkMock } from "../../test-mocks.js";
import { __resetMatrixSdkRuntimeForTests, __setMatrixSdkRuntimeForTests } from "../sdk-runtime.js";

const matrixBotSdkMock = createMatrixBotSdkMock();

describe("matrix SDK logging", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    __resetMatrixSdkRuntimeForTests();
    __setMatrixSdkRuntimeForTests(matrixBotSdkMock as never);
    const logging = await import("./logging.js");
    logging.__resetMatrixSdkLoggingForTests();
  });

  afterEach(() => {
    __resetMatrixSdkRuntimeForTests();
    vi.useRealTimers();
  });

  it("schedules exactly one process restart when Matrix sync reports M_UNKNOWN_TOKEN", async () => {
    const exitSpy = vi.fn();
    const logging = await import("./logging.js");
    logging.__setMatrixUnknownTokenExitForTests(exitSpy);
    logging.ensureMatrixSdkLoggingConfigured();

    const setLoggerCalls = matrixBotSdkMock.LogService.setLogger.mock.calls as unknown[][];
    const logger = setLoggerCalls[0]?.[0] as
      | {
          error: (module: string, ...messageOrObject: unknown[]) => void;
        }
      | undefined;
    expect(logger).toBeTruthy();
    if (!logger) {
      throw new Error("Matrix SDK logger was not configured");
    }

    logger.error("MatrixHttpClient", {
      errcode: "M_UNKNOWN_TOKEN",
      error: "Invalid access token passed.",
      soft_logout: false,
    });
    logger.error("MatrixHttpClient", {
      errcode: "M_UNKNOWN_TOKEN",
      error: "Invalid access token passed.",
      soft_logout: false,
    });

    await vi.runAllTimersAsync();

    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(75);
  });

  it("does not restart on unrelated Matrix HTTP errors", async () => {
    const exitSpy = vi.fn();
    const logging = await import("./logging.js");
    logging.__setMatrixUnknownTokenExitForTests(exitSpy);
    logging.ensureMatrixSdkLoggingConfigured();

    const setLoggerCalls = matrixBotSdkMock.LogService.setLogger.mock.calls as unknown[][];
    const logger = setLoggerCalls[0]?.[0] as
      | {
          error: (module: string, ...messageOrObject: unknown[]) => void;
        }
      | undefined;
    expect(logger).toBeTruthy();
    if (!logger) {
      throw new Error("Matrix SDK logger was not configured");
    }

    logger.error("MatrixHttpClient", {
      errcode: "M_FORBIDDEN",
      error: "Forbidden",
    });

    await vi.runAllTimersAsync();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
