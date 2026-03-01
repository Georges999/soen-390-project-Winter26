import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const TOKEN_KEY = 'google_calendar_tokens';

// DEV MODE: Bypass OAuth for testing
const USE_MOCK_AUTH =
  __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_GOOGLE_AUTH === 'true';

function getClientId() {
  const configuredWebClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID;
  const fallbackWebClientId =
    '976436224829-6kchsprd6kdjmrup6rjaj3pnfcbs2jno.apps.googleusercontent.com';

  // For Expo Go development, always use Web client
  if (__DEV__) {
    return configuredWebClientId || fallbackWebClientId;
  }
  
  // For production builds
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID;
  } else if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID;
  }
  return configuredWebClientId || fallbackWebClientId;
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
    console.log('[Auth] Client ID:', clientId?.substring(0, 20) + '...');

    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug || 'campus-guide';
    const projectNameForProxy = owner ? `@${owner}/${slug}` : `@anonymous/${slug}`;
    const useExpoProxyFlow = Platform.OS !== 'web';
    const responseType = useExpoProxyFlow
      ? AuthSession.ResponseType.Token
      : AuthSession.ResponseType.Code;

    const redirectUri = useExpoProxyFlow
      ? `https://auth.expo.io/${projectNameForProxy}`
      : AuthSession.makeRedirectUri({ path: 'oauthredirect' });
    console.log('[Auth] Redirect URI:', redirectUri);
    
    const authRequest = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_OAUTH_SCOPES,
      redirectUri,
      responseType,
      usePKCE: responseType === AuthSession.ResponseType.Code,
      extraParams:
        responseType === AuthSession.ResponseType.Code
          ? {
              access_type: 'offline',
              prompt: 'consent',
            }
          : {
              prompt: 'consent',
            },
    });

    const codeVerifier = authRequest.codeVerifier;
    
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

    if (result.type === 'success') {
      if (result.params?.access_token) {
        const accessToken = result.params.access_token;
        const expiresIn = Number(result.params.expires_in) || 3600;

        await saveTokens({
          accessToken,
          refreshToken: null,
          expiresIn,
          issuedAt: Date.now(),
        });

        console.log('[Auth] Access token received and saved');

        return {
          success: true,
          accessToken,
        };
      }

      const { code } = result.params;
      console.log('[Auth] Got authorization code, exchanging for token...');

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: codeVerifier,
          },
        },
        discovery
      );

      console.log('[Auth] Token exchange successful');

      await saveTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
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
      refreshToken: tokens.refreshToken,
      expiresIn: tokenResult.expiresIn,
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
  const tokens = await getStoredTokens();
  return tokens !== null;
}
