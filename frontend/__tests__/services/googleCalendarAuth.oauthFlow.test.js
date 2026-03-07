const ORIGINAL_ENV = { ...process.env };

function loadModule({
  platformOS = "ios",
  dev = true,
  exchangeResult = {
    accessToken: "exchanged_access",
    refreshToken: "refresh_token",
    expiresIn: 3600,
  },
  openAuthResult = { type: "success", url: "exp://127.0.0.1#ok" },
  parseReturnUrlResult = { type: "success", params: { access_token: "proxy_access", expires_in: "3600" } },
} = {}) {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH: "false",
    EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID: "web_client_id",
  };
  global.__DEV__ = dev;

  const secureStoreMock = {
    setItemAsync: jest.fn().mockResolvedValue(),
    getItemAsync: jest.fn().mockResolvedValue(null),
    deleteItemAsync: jest.fn().mockResolvedValue(),
  };

  const makeAuthUrlAsyncMock = jest.fn().mockResolvedValue("https://accounts.google.com/auth");
  const parseReturnUrlMock = jest.fn().mockReturnValue(parseReturnUrlResult);
  const getDefaultReturnUrlMock = jest.fn().mockReturnValue("exp://127.0.0.1");
  const makeRedirectUriMock = jest.fn().mockReturnValue("https://redirect.example/oauthredirect");

  const AuthRequestMock = jest.fn().mockImplementation(() => ({
    codeVerifier: "code-verifier",
    promptAsync: jest.fn(),
    makeAuthUrlAsync: makeAuthUrlAsyncMock,
    parseReturnUrl: parseReturnUrlMock,
  }));

  const exchangeCodeAsyncMock = jest.fn().mockResolvedValue(exchangeResult);
  const openAuthSessionAsyncMock = jest.fn().mockResolvedValue(openAuthResult);

  jest.doMock("expo-secure-store", () => secureStoreMock, { virtual: true });
  jest.doMock(
    "expo-auth-session",
    () => ({
      AuthRequest: AuthRequestMock,
      ResponseType: { Code: "code", Token: "token" },
      makeRedirectUri: makeRedirectUriMock,
      getDefaultReturnUrl: getDefaultReturnUrlMock,
      exchangeCodeAsync: exchangeCodeAsyncMock,
      refreshAsync: jest.fn(),
    }),
    { virtual: true },
  );
  jest.doMock(
    "expo-web-browser",
    () => ({
      maybeCompleteAuthSession: jest.fn(),
      openAuthSessionAsync: openAuthSessionAsyncMock,
    }),
    { virtual: true },
  );
  jest.doMock(
    "expo-constants",
    () => ({
      expoConfig: {
        owner: "boudy7168",
        slug: "campus-guide",
      },
    }),
    { virtual: true },
  );
  jest.doMock(
    "react-native",
    () => ({
      Platform: { OS: platformOS },
    }),
    { virtual: true },
  );

  const moduleApi = require("../../src/services/googleCalendarAuth");
  return {
    moduleApi,
    secureStoreMock,
    exchangeCodeAsyncMock,
    openAuthSessionAsyncMock,
    getDefaultReturnUrlMock,
    makeRedirectUriMock,
    parseReturnUrlMock,
  };
}

describe("googleCalendarAuth OAuth flows", () => {
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("authenticates via authorization code exchange", async () => {
    const { moduleApi, exchangeCodeAsyncMock, secureStoreMock } = loadModule({
      platformOS: "ios",
      parseReturnUrlResult: { type: "success", params: { code: "abc123" } },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: true, accessToken: "exchanged_access" });
    expect(exchangeCodeAsyncMock).toHaveBeenCalled();
    expect(secureStoreMock.setItemAsync).toHaveBeenCalled();
  });

  it("authenticates when direct access token is returned", async () => {
    const { moduleApi, exchangeCodeAsyncMock, secureStoreMock } = loadModule({
      platformOS: "ios",
      parseReturnUrlResult: {
        type: "success",
        params: { access_token: "direct_token", expires_in: "1800" },
      },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: true, accessToken: "direct_token" });
    expect(exchangeCodeAsyncMock).not.toHaveBeenCalled();

    const payload = JSON.parse(secureStoreMock.setItemAsync.mock.calls[0][1]);
    expect(payload.refreshToken).toBeNull();
    expect(payload.expiresIn).toBe(1800);
  });

  it("returns cancel error when user cancels", async () => {
    const { moduleApi } = loadModule({
      platformOS: "ios",
      openAuthResult: { type: "cancel" },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({
      success: false,
      error: "User cancelled authentication",
    });
  });

  it("returns oauth error description for unknown result type", async () => {
    const { moduleApi } = loadModule({
      platformOS: "ios",
      parseReturnUrlResult: {
        type: "error",
        params: { error: "redirect_uri_mismatch", error_description: "Redirect URI mismatch" },
      },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({
      success: false,
      error: "Redirect URI mismatch",
    });
  });

  it("uses expo proxy flow on native platforms", async () => {
    const { moduleApi, openAuthSessionAsyncMock, getDefaultReturnUrlMock, parseReturnUrlMock } =
      loadModule({
        platformOS: "ios",
        openAuthResult: { type: "success", url: "exp://127.0.0.1#access_token=proxy_access" },
        parseReturnUrlResult: {
          type: "success",
          params: { access_token: "proxy_access", expires_in: "3600" },
        },
      });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: true, accessToken: "proxy_access" });
    expect(getDefaultReturnUrlMock).toHaveBeenCalled();
    expect(openAuthSessionAsyncMock).toHaveBeenCalled();
    expect(parseReturnUrlMock).toHaveBeenCalled();
  });

  it("returns failure when auth session throws", async () => {
    const { moduleApi, openAuthSessionAsyncMock } = loadModule({ platformOS: "ios" });
    openAuthSessionAsyncMock.mockRejectedValueOnce(new Error("oauth boom"));

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: false, error: "oauth boom" });
  });
});
