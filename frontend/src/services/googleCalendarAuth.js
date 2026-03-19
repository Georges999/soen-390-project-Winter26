import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_KEY = 'google_calendar_tokens';
const GOOGLE_REDIRECT_PATH = 'oauthredirect';
const FALLBACK_NATIVE_REDIRECT_URI = 'com.concordia.campusguide:/oauthredirect';

// DEV MODE: Bypass OAuth for testing
const USE_MOCK_AUTH =
  __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH === 'true';

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

function getClientId() {
  const configuredWebClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID;

  if (Platform.OS === 'web' || isExpoGo()) {
    return configuredWebClientId;
  }

  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID || configuredWebClientId;
  } else if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID || configuredWebClientId;
  }

  return configuredWebClientId;
}

function getProjectNameForProxy() {
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug || 'campus-guide';
  return owner ? `@${owner}/${slug}` : `@anonymous/${slug}`;
}

function getNativeRedirectUri(clientId) {
  if (!clientId || !clientId.endsWith('.apps.googleusercontent.com')) {
    return FALLBACK_NATIVE_REDIRECT_URI;
  }

  const clientPrefix = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${clientPrefix}:/oauthredirect`;
}

function getRedirectUri(clientId) {
  if (Platform.OS === 'web') {
    return AuthSession.makeRedirectUri({ path: GOOGLE_REDIRECT_PATH });
  }

  if (isExpoGo()) {
    return `https://auth.expo.io/${getProjectNameForProxy()}`;
  }

  return AuthSession.makeRedirectUri({
    native: getNativeRedirectUri(clientId),
  });
}

function assertGoogleOAuthConfig(clientId) {
  if (!clientId) {
    throw new Error(
      'Google OAuth is not configured. Add the EXPO_PUBLIC_GOOGLE_OAUTH client ID variables to your .env file.'
    );
  }
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function authenticateWithGoogle() {
  // DEV MODE: Mock authentication
  if (USE_MOCK_AUTH) {
    console.log('[Auth] Using mock authentication (DEV MODE)');
    const mockTokens = {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token',
      expiresIn: 3600,
      issuedAt: Date.now(),
    };
    await saveTokens(mockTokens);
    return {
      success: true,
      accessToken: mockTokens.accessToken,
    };
  }

  try {
    console.log('[Auth] Starting authentication...');
    const clientId = getClientId();
    assertGoogleOAuthConfig(clientId);
    console.log('[Auth] Client ID:', clientId?.substring(0, 20) + '...');

    const useExpoProxyFlow = Platform.OS !== 'web' && isExpoGo();
    const redirectUri = getRedirectUri(clientId);
    console.log('[Auth] Redirect URI:', redirectUri);
    
    const authRequest = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_OAUTH_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
      },
    });

    console.log('[Auth] Opening browser...');

    let result;
    if (useExpoProxyFlow) {
      const returnUrl = AuthSession.getDefaultReturnUrl();
      const authUrl = await authRequest.makeAuthUrlAsync(discovery);
      const startUrl = `${redirectUri}/start?${new URLSearchParams({
        authUrl,
        returnUrl,
      }).toString()}`;

      const browserResult = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

      if (browserResult.type === 'success') {
        result = authRequest.parseReturnUrl(browserResult.url);
      } else {
        result = { type: browserResult.type };
      }
    } else {
      result = await authRequest.promptAsync(discovery);
    }

    console.log('[Auth] Result type:', result.type);
    if (result?.params) {
      console.log('[Auth] Result params:', JSON.stringify(result.params));
    }

    if (result.type === 'success') {
      const { code } = result.params;

      if (!code) {
        return {
          success: false,
          error: result.params?.error_description || result.params?.error || 'Authentication failed',
        };
      }

      console.log('[Auth] Got authorization code, exchanging for token...');

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: authRequest.codeVerifier,
          },
        },
        discovery
      );

      console.log('[Auth] Token exchange successful');

      await saveTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken || null,
        expiresIn: tokenResult.expiresIn || 3600,
        issuedAt: Date.now(),
      });

      console.log('[Auth] Tokens saved');

      return {
        success: true,
        accessToken: tokenResult.accessToken,
      };
    } else if (result.type === 'cancel') {
      console.log('[Auth] User cancelled');
      return {
        success: false,
        error: 'User cancelled authentication',
      };
    } else {
      console.log('[Auth] Unknown result type:', result.type);
      const oauthError = result?.params?.error;
      const oauthErrorDescription = result?.params?.error_description;
      return {
        success: false,
        error:
          oauthErrorDescription ||
          oauthError ||
          'Authentication failed',
      };
    }
  } catch (error) {
    console.error('[Auth] Exception:', error);
    if (error?.response) {
      console.error('[Auth] Exception response:', JSON.stringify(error.response));
    }
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
}

export async function saveTokens(tokens) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to save tokens:', error);
    throw error;
  }
}

export async function getStoredTokens() {
  try {
    const tokens = await SecureStore.getItemAsync(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

export async function isTokenExpired(tokens) {
  if (!tokens || !tokens.expiresIn || !tokens.issuedAt) {
    return true;
  }
  
  const expiryTime = tokens.issuedAt + (tokens.expiresIn * 1000);
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;
  
  return now >= (expiryTime - bufferTime);
}

export async function refreshAccessToken() {
  try {
    const tokens = await getStoredTokens();
    
    if (!tokens || !tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = getClientId();
    
    const tokenResult = await AuthSession.refreshAsync(
      {
        clientId,
        refreshToken: tokens.refreshToken,
      },
      discovery
    );

    const newTokens = {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken || tokens.refreshToken,
      expiresIn: tokenResult.expiresIn || tokens.expiresIn || 3600,
      issuedAt: Date.now(),
    };

    await saveTokens(newTokens);

    return {
      success: true,
      accessToken: tokenResult.accessToken,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    await clearTokens();
    return {
      success: false,
      error: 'Failed to refresh token',
    };
  }
}

export async function getValidAccessToken() {
  try {
    const tokens = await getStoredTokens();
    
    if (!tokens) {
      return null;
    }

    if (await isTokenExpired(tokens)) {
      const refreshResult = await refreshAccessToken();
      return refreshResult.success ? refreshResult.accessToken : null;
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('Failed to get valid token:', error);
    return null;
  }
}

export async function disconnectCalendar() {
  try {
    const tokens = await getStoredTokens();
    
    if (tokens && tokens.accessToken) {
      await fetch(discovery.revocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `token=${tokens.accessToken}`,
      });
    }
    
    await clearTokens();
    
    return { success: true };
  } catch (error) {
    console.error('Disconnect error:', error);
    await clearTokens();
    return { success: false, error: error.message };
  }
}

export async function isAuthenticated() {
  const accessToken = await getValidAccessToken();
  return Boolean(accessToken);
}
