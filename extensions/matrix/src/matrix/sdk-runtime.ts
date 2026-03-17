import { createRequire } from "node:module";

type MatrixSdkRuntime = typeof import("@vector-im/matrix-bot-sdk");

let cachedMatrixSdkRuntime: MatrixSdkRuntime | null = null;
let injectedMatrixSdkRuntimeForTests: MatrixSdkRuntime | null = null;

export function loadMatrixSdk(): MatrixSdkRuntime {
  if (injectedMatrixSdkRuntimeForTests) {
    return injectedMatrixSdkRuntimeForTests;
  }
  if (cachedMatrixSdkRuntime) {
    return cachedMatrixSdkRuntime;
  }
  const req = createRequire(import.meta.url);
  cachedMatrixSdkRuntime = req("@vector-im/matrix-bot-sdk") as MatrixSdkRuntime;
  return cachedMatrixSdkRuntime;
}

export function getMatrixLogService() {
  return loadMatrixSdk().LogService;
}

export function __setMatrixSdkRuntimeForTests(runtime: MatrixSdkRuntime): void {
  injectedMatrixSdkRuntimeForTests = runtime;
}

export function __resetMatrixSdkRuntimeForTests(): void {
  injectedMatrixSdkRuntimeForTests = null;
  cachedMatrixSdkRuntime = null;
}
