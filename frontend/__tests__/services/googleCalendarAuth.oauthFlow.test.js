const ORIGINAL_ENV = { ...process.env };

function loadModule({
  platformOS = 'ios',
  exchangeResult = {
    accessToken: 'exchanged_access',
    refreshToken: 'refresh_token',
    expiresIn: 3600,
  },
  promptAsyncResult = { type: 'success', params: { code: 'native-code' } },
} = {}) {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH: 'false',
    EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID: 'web_client_id',
    EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID: 'ios_client_id',
    EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID: 'android_client_id',
  };
  global.__DEV__ = true;

  const secureStoreMock = {
    setItemAsync: jest.fn().mockResolvedValue(),
    getItemAsync: jest.fn().mockResolvedValue(null),
    deleteItemAsync: jest.fn().mockResolvedValue(),
  };

  const promptAsyncMock = jest.fn().mockResolvedValue(promptAsyncResult);
  const makeRedirectUriMock = jest.fn().mockReturnValue('com.concordia.campusguide://oauthredirect');

  const AuthRequestMock = jest.fn().mockImplementation(() => ({
    codeVerifier: 'code-verifier',
    promptAsync: promptAsyncMock,
    makeAuthUrlAsync: jest.fn(),
    parseReturnUrl: jest.fn(),
  }));

  const exchangeCodeAsyncMock = jest.fn().mockResolvedValue(exchangeResult);

  jest.doMock('expo-secure-store', () => secureStoreMock, { virtual: true });
  jest.doMock(
    'expo-auth-session',
    () => ({
      AuthRequest: AuthRequestMock,
      ResponseType: { Code: 'code', Token: 'token' },
      makeRedirectUri: makeRedirectUriMock,
      getDefaultReturnUrl: jest.fn(),
      exchangeCodeAsync: exchangeCodeAsyncMock,
      refreshAsync: jest.fn(),
    }),
    { virtual: true }
  );
  jest.doMock(
    'expo-web-browser',
    () => ({
      maybeCompleteAuthSession: jest.fn(),
      openAuthSessionAsync: jest.fn(),
    }),
    { virtual: true }
  );
  jest.doMock(
    'expo-constants',
    () => ({
      __esModule: true,
      default: {
        appOwnership: 'standalone',
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
    promptAsyncMock,
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
});
