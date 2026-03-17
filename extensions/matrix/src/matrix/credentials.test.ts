import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PluginRuntime } from "openclaw/plugin-sdk/matrix";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setMatrixRuntime } from "../runtime.js";
import {
  clearMatrixCredentials,
  loadMatrixCredentials,
  resolveMatrixCredentialsPath,
  touchMatrixCredentials,
} from "./credentials.js";

const runtimeStub = {
  state: {
    resolveStateDir: (env: NodeJS.ProcessEnv, homedir: typeof os.homedir) =>
      env.OPENCLAW_STATE_DIR ?? path.join(homedir(), ".openclaw"),
  },
} as unknown as PluginRuntime;

describe("matrix credentials migration", () => {
  let stateDir = "";
  let previousStateDir: string | undefined;

  beforeAll(() => {
    setMatrixRuntime(runtimeStub);
  });

  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-matrix-creds-"));
    previousStateDir = process.env.OPENCLAW_STATE_DIR;
    process.env.OPENCLAW_STATE_DIR = stateDir;
  });

  afterEach(() => {
    if (previousStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = previousStateDir;
    }
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  it("falls back to legacy credentials.json for named accounts", () => {
    const legacyPath = path.join(stateDir, "credentials", "matrix", "credentials.json");
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(
      legacyPath,
      JSON.stringify(
        {
          homeserver: "https://matrix.example.org",
          userId: "@reef:example.org",
          accessToken: "legacy-token",
          deviceId: "LEGACY123",
          createdAt: "2026-03-01T00:00:00.000Z",
          lastUsedAt: "2026-03-01T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf-8",
    );

    expect(loadMatrixCredentials(process.env, "reef")).toMatchObject({
      userId: "@reef:example.org",
      accessToken: "legacy-token",
      deviceId: "LEGACY123",
    });
  });

  it("touch promotes legacy credentials into the named-account path", () => {
    const legacyPath = path.join(stateDir, "credentials", "matrix", "credentials.json");
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(
      legacyPath,
      JSON.stringify(
        {
          homeserver: "https://matrix.example.org",
          userId: "@reef:example.org",
          accessToken: "legacy-token",
          deviceId: "LEGACY123",
          createdAt: "2026-03-01T00:00:00.000Z",
          lastUsedAt: "2026-03-01T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf-8",
    );

    touchMatrixCredentials(process.env, "reef");

    const namedPath = resolveMatrixCredentialsPath(process.env, "reef");
    expect(fs.existsSync(namedPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(namedPath, "utf-8"))).toMatchObject({
      userId: "@reef:example.org",
      accessToken: "legacy-token",
      deviceId: "LEGACY123",
    });
  });

  it("clears both named and legacy credentials for named accounts", () => {
    const legacyPath = path.join(stateDir, "credentials", "matrix", "credentials.json");
    const namedPath = resolveMatrixCredentialsPath(process.env, "reef");
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(legacyPath, "{}", "utf-8");
    fs.writeFileSync(namedPath, "{}", "utf-8");

    clearMatrixCredentials(process.env, "reef");

    expect(fs.existsSync(legacyPath)).toBe(false);
    expect(fs.existsSync(namedPath)).toBe(false);
  });
});
