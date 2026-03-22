const ORIGINAL_ENV = { ...process.env };

function loadModule({
  platformOS = 'ios',
  appOwnership = 'standalone',
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
        owner: 'boudy7168',
        slug: 'campus-guide',
      },
      default: {
        appOwnership,
        expoConfig: {
          owner: 'boudy7168',
          slug: 'campus-guide',
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
    exchangeCodeAsyncMock,
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
      exchangeCodeAsyncMock,
      promptAsyncMock,
    } = loadModule({
      platformOS: 'web',
    });

    const result = await moduleApi.authenticateWithGoogle();

    expect(result).toEqual({ success: true, accessToken: 'exchanged_access' });
    expect(promptAsyncMock).toHaveBeenCalled();
    expect(exchangeCodeAsyncMock).toHaveBeenCalled();
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
