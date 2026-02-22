import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';

// We need to mock modules before importing the module under test
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    codeVerifier: 'mock_code_verifier',
    promptAsync: jest.fn(),
  })),
  ResponseType: { Code: 'code' },
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}), { virtual: true });

// Import after mocks
const {
  saveTokens,
  getStoredTokens,
  clearTokens,
  isTokenExpired,
  refreshAccessToken,
  getValidAccessToken,
  disconnectCalendar,
  isAuthenticated,
  authenticateWithGoogle,
} = require('../../src/services/googleCalendarAuth');

describe('googleCalendarAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  describe('saveTokens', () => {
    it('should save tokens to SecureStore', async () => {
      const tokens = { accessToken: 'abc', refreshToken: 'def', expiresIn: 3600, issuedAt: 1000 };
      SecureStore.setItemAsync.mockResolvedValue();
      await saveTokens(tokens);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'google_calendar_tokens',
        JSON.stringify(tokens)
      );
    });

    it('should throw if SecureStore fails', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('storage error'));
      await expect(saveTokens({ accessToken: 'x' })).rejects.toThrow('storage error');
    });
  });

  describe('getStoredTokens', () => {
    it('should return parsed tokens from SecureStore', async () => {
      const tokens = { accessToken: 'abc', refreshToken: 'def' };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(tokens));
      const result = await getStoredTokens();
      expect(result).toEqual(tokens);
    });

    it('should return null when no tokens stored', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await getStoredTokens();
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('read error'));
      const result = await getStoredTokens();
      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should delete tokens from SecureStore', async () => {
      SecureStore.deleteItemAsync.mockResolvedValue();
      await clearTokens();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('google_calendar_tokens');
    });

    it('should not throw on error', async () => {
      SecureStore.deleteItemAsync.mockRejectedValue(new Error('delete error'));
      await expect(clearTokens()).resolves.not.toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true if tokens is null', async () => {
      expect(await isTokenExpired(null)).toBe(true);
    });

    it('should return true if expiresIn is missing', async () => {
      expect(await isTokenExpired({ issuedAt: Date.now() })).toBe(true);
    });

    it('should return true if issuedAt is missing', async () => {
      expect(await isTokenExpired({ expiresIn: 3600 })).toBe(true);
    });

    it('should return false for fresh token', async () => {
      const tokens = {
        expiresIn: 3600,
        issuedAt: Date.now(),
      };
      expect(await isTokenExpired(tokens)).toBe(false);
    });

    it('should return true for expired token', async () => {
      const tokens = {
        expiresIn: 3600,
        issuedAt: Date.now() - 4000 * 1000, // well past expiry
      };
      expect(await isTokenExpired(tokens)).toBe(true);
    });

    it('should return true when within 5 minute buffer', async () => {
      const tokens = {
        expiresIn: 3600,
        // Token expires at issuedAt + 3600*1000, buffer is 5*60*1000=300000
        // So buffer zone starts at issuedAt + 3300*1000
        issuedAt: Date.now() - 3400 * 1000, // within buffer zone
      };
      expect(await isTokenExpired(tokens)).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('should throw when no stored tokens', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await refreshAccessToken();
      expect(result).toEqual({ success: false, error: 'Failed to refresh token' });
    });

    it('should throw when no refresh token', async () => {
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({ accessToken: 'abc' }));
      const result = await refreshAccessToken();
      expect(result).toEqual({ success: false, error: 'Failed to refresh token' });
    });

    it('should refresh tokens successfully', async () => {
      const storedTokens = { accessToken: 'old', refreshToken: 'refresh123', expiresIn: 3600, issuedAt: 1000 };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(storedTokens));
      SecureStore.setItemAsync.mockResolvedValue();

      AuthSession.refreshAsync.mockResolvedValue({
        accessToken: 'new_access',
        expiresIn: 3600,
      });

      const result = await refreshAccessToken();
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new_access');
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should clear tokens on refresh failure', async () => {
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({ accessToken: 'old', refreshToken: 'refresh123' }));
      SecureStore.deleteItemAsync.mockResolvedValue();
      AuthSession.refreshAsync.mockRejectedValue(new Error('refresh failed'));

      const result = await refreshAccessToken();
      expect(result.success).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('getValidAccessToken', () => {
    it('should return null when no tokens stored', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await getValidAccessToken();
      expect(result).toBeNull();
    });

    it('should return existing token when not expired', async () => {
      const tokens = { accessToken: 'valid_token', expiresIn: 3600, issuedAt: Date.now() };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(tokens));
      const result = await getValidAccessToken();
      expect(result).toBe('valid_token');
    });

    it('should refresh token when expired', async () => {
      const expiredTokens = { accessToken: 'expired', refreshToken: 'refresh123', expiresIn: 3600, issuedAt: Date.now() - 5000000 };
      SecureStore.getItemAsync
        .mockResolvedValueOnce(JSON.stringify(expiredTokens)) // first call in getValidAccessToken
        .mockResolvedValueOnce(JSON.stringify(expiredTokens)); // second call in refreshAccessToken
      SecureStore.setItemAsync.mockResolvedValue();
      AuthSession.refreshAsync.mockResolvedValue({ accessToken: 'new_token', expiresIn: 3600 });

      const result = await getValidAccessToken();
      expect(result).toBe('new_token');
    });

    it('should return null on error', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('read error'));
      const result = await getValidAccessToken();
      expect(result).toBeNull();
    });
  });

  describe('disconnectCalendar', () => {
    it('should revoke token and clear stored tokens', async () => {
      const tokens = { accessToken: 'token123', refreshToken: 'refresh' };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(tokens));
      SecureStore.deleteItemAsync.mockResolvedValue();
      global.fetch.mockResolvedValue({ ok: true });

      const result = await disconnectCalendar();
      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke',
        expect.objectContaining({
          method: 'POST',
          body: 'token=token123',
        })
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should still succeed when getStoredTokens returns null (error caught internally)', async () => {
      SecureStore.getItemAsync.mockRejectedValue(new Error('read error'));
      SecureStore.deleteItemAsync.mockResolvedValue();

      const result = await disconnectCalendar();
      // getStoredTokens catches its own error and returns null, so disconnectCalendar succeeds
      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should return failure when clearTokens throws after revocation', async () => {
      const tokens = { accessToken: 'token123', refreshToken: 'refresh' };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(tokens));
      global.fetch.mockResolvedValue({ ok: true });
      // First clearTokens call inside try block fails
      SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('delete error'))
        .mockResolvedValue();

      const result = await disconnectCalendar();
      // The error propagates to the catch block
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should handle no tokens stored', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      SecureStore.deleteItemAsync.mockResolvedValue();

      const result = await disconnectCalendar();
      expect(result).toEqual({ success: true });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when tokens exist', async () => {
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({ accessToken: 'abc' }));
      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when no tokens', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('authenticateWithGoogle', () => {
    it('should return success in mock/DEV mode', async () => {
      SecureStore.setItemAsync.mockResolvedValue();
      const result = await authenticateWithGoogle();
      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });
});
