const ORIGINAL_ENV = { ...process.env };

function loadModule({
  platformOS = 'ios',
  appOwnership = 'standalone',
  owner = 'boudy7168',
  slug = 'campus-guide',
  exchangeResult = {
    accessToken: 'exchanged_access',
    refreshToken: 'refresh_token',
    expiresIn: 3600,
  },
  promptAsyncResult = { type: 'success', params: { code: 'native-code' } },
  openAuthResult = { type: 'success', url: 'exp://127.0.0.1#state=ok' },
  parseReturnUrlResult = { type: 'success', params: { code: 'proxy-code' } },
  webClientId = 'web_client_id',
  iosClientId = 'ios_client_id',
  androidClientId = 'android_client_id',
} = {}) {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH: 'false',
    EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID: webClientId,
    EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID: iosClientId,
    EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID: androidClientId,
  };
  global.__DEV__ = true;

  const secureStoreMock = {
    setItemAsync: jest.fn().mockResolvedValue(),
    getItemAsync: jest.fn().mockResolvedValue(null),
    deleteItemAsync: jest.fn().mockResolvedValue(),
  };

  const promptAsyncMock = jest.fn().mockResolvedValue(promptAsyncResult);
  const makeRedirectUriMock = jest.fn().mockReturnValue('com.concordia.campusguide://oauthredirect');
  const openAuthSessionAsyncMock = jest.fn().mockResolvedValue(openAuthResult);
  const getDefaultReturnUrlMock = jest.fn().mockReturnValue('exp://127.0.0.1');
  const parseReturnUrlMock = jest.fn().mockReturnValue(parseReturnUrlResult);

  const AuthRequestMock = jest.fn().mockImplementation(() => ({
    codeVerifier: 'code-verifier',
    promptAsync: promptAsyncMock,
    makeAuthUrlAsync: jest.fn().mockResolvedValue('https://accounts.google.com/auth'),
    parseReturnUrl: parseReturnUrlMock,
  }));

  const exchangeCodeAsyncMock = jest.fn().mockResolvedValue(exchangeResult);

  jest.doMock('expo-secure-store', () => secureStoreMock, { virtual: true });
  jest.doMock(
    'expo-auth-session',
    () => ({
      AuthRequest: AuthRequestMock,
      ResponseType: { Code: 'code', Token: 'token' },
      makeRedirectUri: makeRedirectUriMock,
      getDefaultReturnUrl: getDefaultReturnUrlMock,
      exchangeCodeAsync: exchangeCodeAsyncMock,
      refreshAsync: jest.fn(),
    }),
    { virtual: true }
  );
  jest.doMock(
    'expo-web-browser',
    () => ({
      maybeCompleteAuthSession: jest.fn(),
      openAuthSessionAsync: openAuthSessionAsyncMock,
    }),
    { virtual: true }
  );
  jest.doMock(
    'expo-constants',
    () => ({
      __esModule: true,
      appOwnership,
      expoConfig: {
        owner,
        slug,
      },
      default: {
        appOwnership,
        expoConfig: {
          owner,
          slug,
        },
      },
    }),
    { virtual: true }
  );
  jest.doMock(
    'react-native',
    () => ({
      Platform: { OS: platformOS },
    }),
    { virtual: true }
  );

  const moduleApi = require('../../src/services/googleCalendarAuth');
  return {
    moduleApi,
    secureStoreMock,
    AuthRequestMock,
    exchangeCodeAsyncMock,
    makeRedirectUriMock,
    openAuthSessionAsyncMock,
    promptAsyncMock,
    getDefaultReturnUrlMock,
    parseReturnUrlMock,
  };
}

describe('googleCalendarAuth OAuth flows', () => {
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('authenticates via authorization code exchange', async () => {
    const { moduleApi, exchangeCodeAsyncMock, secureStoreMock, promptAsyncMock } = loadModule();

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(promptAsyncMock).toHaveBeenCalled();
    expect(exchangeCodeAsyncMock).toHaveBeenCalled();
    expect(secureStoreMock.setItemAsync).toHaveBeenCalled();
  });

  it('returns cancel error when user cancels', async () => {
    const { moduleApi } = loadModule({
      promptAsyncResult: { type: 'cancel' },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({
      success: false,
      error: 'User cancelled authentication',
    });
  });

  it('returns oauth error description for unknown result type', async () => {
    const { moduleApi } = loadModule({
      promptAsyncResult: {
        type: 'error',
        params: { error: 'redirect_uri_mismatch', error_description: 'Redirect URI mismatch' },
      },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({
      success: false,
      error: 'Redirect URI mismatch',
    });
  });

  it('returns failure when promptAsync throws', async () => {
    const { moduleApi, promptAsyncMock } = loadModule();
    promptAsyncMock.mockRejectedValueOnce(new Error('oauth boom'));

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({ success: false, error: 'oauth boom' });
  });

  it('returns an auth error when success does not include a code', async () => {
    const { moduleApi } = loadModule({
      promptAsyncResult: {
        type: 'success',
        params: { error: 'access_denied', error_description: 'Access denied' },
      },
    });

    const result = await moduleApi.authenticateWithGoogle();
    expect(result).toEqual({
      success: false,
      error: 'Access denied',
    });
  });

  it('uses the web redirect flow on web', async () => {
    const {
      moduleApi,
      AuthRequestMock,
      exchangeCodeAsyncMock,
      makeRedirectUriMock,
      promptAsyncMock,
    } = loadModule({
      platformOS: 'web',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(promptAsyncMock).toHaveBeenCalled();
    expect(exchangeCodeAsyncMock).toHaveBeenCalled();
    expect(makeRedirectUriMock).toHaveBeenCalledWith({ path: 'oauthredirect' });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'web_client_id',
        redirectUri: 'com.concordia.campusguide://oauthredirect',
      })
    );
  });

  it('uses the Expo Go proxy flow with an anonymous project name', async () => {
    const {
      moduleApi,
      AuthRequestMock,
      openAuthSessionAsyncMock,
      getDefaultReturnUrlMock,
      parseReturnUrlMock,
    } = loadModule({
      appOwnership: 'expo',
      owner: null,
      slug: null,
      parseReturnUrlResult: { type: 'success', params: { code: 'proxy-code' } },
      webClientId: 'expo_web_client_id',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'expo_web_client_id',
        redirectUri: 'https://auth.expo.io/@anonymous/campus-guide',
      })
    );
    expect(getDefaultReturnUrlMock).toHaveBeenCalled();
    expect(openAuthSessionAsyncMock).toHaveBeenCalledWith(
      expect.stringContaining('https://auth.expo.io/@anonymous/campus-guide/start?'),
      'exp://127.0.0.1'
    );
    expect(parseReturnUrlMock).toHaveBeenCalled();
  });

  it('builds a native redirect URI from a Google client id on Android', async () => {
    const {
      moduleApi,
      AuthRequestMock,
      makeRedirectUriMock,
    } = loadModule({
      platformOS: 'android',
      androidClientId: 'android123.apps.googleusercontent.com',
      webClientId: 'web_client_id',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(makeRedirectUriMock).toHaveBeenCalledWith({
      native: 'com.googleusercontent.apps.android123:/oauthredirect',
    });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'android123.apps.googleusercontent.com',
        redirectUri: 'com.concordia.campusguide://oauthredirect',
      })
    );
  });

  it('falls back to the web client id when Android client id is missing', async () => {
    const { moduleApi, AuthRequestMock } = loadModule({
      platformOS: 'android',
      androidClientId: '',
      webClientId: 'android_fallback_web_client_id',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'android_fallback_web_client_id',
      })
    );
  });

  it('uses the owner slug when Expo Go project metadata is present', async () => {
    const { moduleApi, AuthRequestMock } = loadModule({
      appOwnership: 'expo',
      owner: 'boudy7168',
      slug: 'campus-guide',
      webClientId: 'expo_web_client_id',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'https://auth.expo.io/@boudy7168/campus-guide',
      })
    );
  });

  it('falls back to the web client id on unsupported native platforms', async () => {
    const { moduleApi, AuthRequestMock } = loadModule({
      platformOS: 'windows',
      webClientId: 'fallback_web_client_id',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(AuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'fallback_web_client_id',
      })
    );
  });

  it('returns a configuration error when no client id is configured', async () => {
    const { moduleApi } = loadModule({
      webClientId: '',
      iosClientId: '',
      androidClientId: '',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({
      success: false,
      error:
        'Google OAuth is not configured. Add the EXPO_PUBLIC_GOOGLE_OAUTH client ID variables to your .env file.',
    });
  });

  it('logs the oauth error response payload when present on an exception', async () => {
    const { moduleApi, promptAsyncMock } = loadModule();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    promptAsyncMock.mockRejectedValueOnce({
      message: 'oauth boom',
      response: { status: 400, data: 'bad request' },
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: false, error: 'oauth boom' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Auth] Exception response:',
      JSON.stringify({ status: 400, data: 'bad request' })
    );

    consoleErrorSpy.mockRestore();
  });
});

/* ------------------------------------------------------------------ */
/*  Production getClientId paths (__DEV__ = false)                    */
/* ------------------------------------------------------------------ */
describe("googleCalendarAuth – production getClientId", () => {
  afterAll(() => {
    process.env = ORIGINAL_ENV;
    global.__DEV__ = true;
  });

  function setupProd(platformOS, envOverrides = {}) {
    jest.resetModules();
    global.__DEV__ = false;
    process.env = {
      ...ORIGINAL_ENV,
      EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH: "false",
      EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID: "web_cid",
      ...envOverrides,
    };

    const secureStore = {
      setItemAsync: jest.fn().mockResolvedValue(),
      getItemAsync: jest.fn().mockResolvedValue(null),
      deleteItemAsync: jest.fn().mockResolvedValue(),
    };
    const promptAsyncFn = jest.fn().mockResolvedValue({
      type: "success",
      params: { access_token: "prompt_tok", expires_in: "3600" },
    });
    const AuthReq = jest.fn().mockImplementation(() => ({
      codeVerifier: "cv",
      promptAsync: promptAsyncFn,
      makeAuthUrlAsync: jest.fn().mockResolvedValue("https://auth"),
      parseReturnUrl: jest.fn().mockReturnValue({
        type: "success",
        params: { access_token: "proxy_tok", expires_in: "3600" },
      }),
    }));

    jest.doMock("expo-secure-store", () => secureStore, { virtual: true });
    jest.doMock(
      "expo-auth-session",
      () => ({
        AuthRequest: AuthReq,
        ResponseType: { Code: "code", Token: "token" },
        makeRedirectUri: jest.fn().mockReturnValue("https://redirect/"),
        getDefaultReturnUrl: jest.fn().mockReturnValue("exp://return"),
        exchangeCodeAsync: jest.fn(),
        refreshAsync: jest.fn(),
      }),
      { virtual: true },
    );
    jest.doMock("expo-web-browser", () => ({
      maybeCompleteAuthSession: jest.fn(),
      openAuthSessionAsync: jest.fn().mockResolvedValue({
        type: "success",
        url: "exp://return#ok",
      }),
    }), { virtual: true });
    jest.doMock("expo-constants", () => ({
      expoConfig: { owner: "test", slug: "campus-guide" },
    }), { virtual: true });
    jest.doMock("react-native", () => ({
      Platform: { OS: platformOS },
    }), { virtual: true });

    const mod = require("../../src/services/googleCalendarAuth");
    const { AuthRequest } = require("expo-auth-session");
    return { mod, AuthRequest, promptAsync: promptAsyncFn };
  }

  it("uses iOS client ID in production", async () => {
    const { mod, AuthRequest } = setupProd("ios", {
      EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID: "ios_cid",
    });
    await mod.authenticateWithGoogle();
    expect(AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "ios_cid" }),
    );
  });
});
