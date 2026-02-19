import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'campusguide',
  preferLocalhost: true,
});

const TOKEN_KEY = 'google_calendar_tokens';

function getClientId() {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID;
  } else if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID;
  }
  return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID;
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function authenticateWithGoogle() {
  try {
    const clientId = getClientId();
    
    const authRequest = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_OAUTH_SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    });

    await authRequest.makeAuthUrlAsync(discovery);
    
    const result = await authRequest.promptAsync(discovery, {
      useProxy: true,
    });

    if (result.type === 'success') {
      const { code } = result.params;
      
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri: REDIRECT_URI,
          extraParams: {
            code_verifier: authRequest.codeVerifier,
          },
        },
        discovery
      );

      await saveTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
        issuedAt: Date.now(),
      });

      return {
        success: true,
        accessToken: tokenResult.accessToken,
      };
    } else if (result.type === 'cancel') {
      return {
        success: false,
        error: 'User cancelled authentication',
      };
    } else {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('OAuth error:', error);
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
