import type { PluginRuntime } from "openclaw/plugin-sdk/matrix";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setMatrixRuntime } from "../../runtime.js";

const fetchWithSsrFGuardMock = vi.fn();
const loadMatrixCredentialsMock = vi.fn();
const saveMatrixCredentialsMock = vi.fn();
const credentialsMatchConfigMock = vi.fn();
const touchMatrixCredentialsMock = vi.fn();
const clearMatrixCredentialsMock = vi.fn();

vi.mock("openclaw/plugin-sdk/matrix", () => ({
  fetchWithSsrFGuard: (...args: unknown[]) => fetchWithSsrFGuardMock(...args),
  normalizeResolvedSecretInputString: ({ value }: { value: unknown }) =>
    typeof value === "string" ? value : undefined,
  normalizeSecretInputString: (value: unknown) => (typeof value === "string" ? value : undefined),
}));

vi.mock("../credentials.js", () => ({
  loadMatrixCredentials: (...args: unknown[]) => loadMatrixCredentialsMock(...args),
  saveMatrixCredentials: (...args: unknown[]) => saveMatrixCredentialsMock(...args),
  credentialsMatchConfig: (...args: unknown[]) => credentialsMatchConfigMock(...args),
  touchMatrixCredentials: (...args: unknown[]) => touchMatrixCredentialsMock(...args),
  clearMatrixCredentials: (...args: unknown[]) => clearMatrixCredentialsMock(...args),
}));

const runtimeStub = {
  config: {
    loadConfig: () => ({}),
  },
} as unknown as PluginRuntime;

let resolveMatrixAuth: typeof import("./config.js").resolveMatrixAuth;

beforeAll(async () => {
  setMatrixRuntime(runtimeStub);
  ({ resolveMatrixAuth } = await import("./config.js"));
});

describe("resolveMatrixAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears stale cached credentials and falls back to password login", async () => {
    loadMatrixCredentialsMock.mockReturnValue({
      homeserver: "https://matrix.home.ndbroadbent.com",
      userId: "@reef:matrix.home.ndbroadbent.com",
      accessToken: "stale-token",
      deviceId: "OLDDEVICE",
      createdAt: "2026-03-01T00:00:00.000Z",
      lastUsedAt: "2026-03-01T00:00:00.000Z",
    });
    credentialsMatchConfigMock.mockReturnValue(true);
    fetchWithSsrFGuardMock
      .mockResolvedValueOnce({
        response: {
          ok: false,
          text: async () => '{"errcode":"M_UNKNOWN_TOKEN","error":"Unknown token"}',
        },
        release: async () => {},
      })
      .mockResolvedValueOnce({
        response: {
          ok: true,
          json: async () => ({
            access_token: "fresh-token",
            user_id: "@reef:matrix.home.ndbroadbent.com",
            device_id: "NEWDEVICE",
          }),
        },
        release: async () => {},
      });

    const auth = await resolveMatrixAuth({
      cfg: {
        channels: {
          matrix: {
            accounts: {
              reef: {
                homeserver: "https://matrix.home.ndbroadbent.com",
                userId: "@reef:matrix.home.ndbroadbent.com",
                password: "secret",
              },
            },
          },
        },
      },
      accountId: "reef",
    });

    expect(clearMatrixCredentialsMock).toHaveBeenCalledWith(process.env, "reef");
    expect(saveMatrixCredentialsMock).toHaveBeenCalledWith(
      {
        homeserver: "https://matrix.home.ndbroadbent.com",
        userId: "@reef:matrix.home.ndbroadbent.com",
        accessToken: "fresh-token",
        deviceId: "NEWDEVICE",
      },
      process.env,
      "reef",
    );
    expect(auth.accessToken).toBe("fresh-token");
    expect(fetchWithSsrFGuardMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        auditContext: "matrix.whoami",
        policy: expect.objectContaining({
          allowPrivateNetwork: true,
          allowedHostnames: ["matrix.home.ndbroadbent.com"],
        }),
      }),
    );
    expect(fetchWithSsrFGuardMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        auditContext: "matrix.login",
        policy: expect.objectContaining({
          allowPrivateNetwork: true,
          allowedHostnames: ["matrix.home.ndbroadbent.com"],
        }),
      }),
    );
  });
});
