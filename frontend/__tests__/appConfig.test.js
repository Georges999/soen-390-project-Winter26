import appConfig from '../app.config';

describe('app.config.js', () => {
  const originalIosClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID;

  afterEach(() => {
    if (originalIosClientId === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID = originalIosClientId;
    }
  });

  it('should return config with default name and slug', () => {
    const config = appConfig({ config: {} });
    expect(config.name).toBe('Campus Guide');
    expect(config.slug).toBe('campus-guide');
  });

  it('should preserve provided name and slug', () => {
    const config = appConfig({ config: { name: 'My App', slug: 'my-app' } });
    expect(config.name).toBe('My App');
    expect(config.slug).toBe('my-app');
  });

  it('should include iOS location permission description', () => {
    const config = appConfig({ config: {} });
    expect(config.ios.infoPlist.NSLocationWhenInUseUsageDescription).toBeTruthy();
  });

  it('should include Android Google Maps config', () => {
    const config = appConfig({ config: {} });
    expect(config.android.config.googleMaps).toBeDefined();
  });

  it('should merge existing iOS config', () => {
    const config = appConfig({
      config: { ios: { bundleIdentifier: 'com.test' } },
    });
    expect(config.ios.bundleIdentifier).toBe('com.test');
    expect(config.ios.infoPlist).toBeDefined();
  });

  it('should merge existing android config', () => {
    const config = appConfig({
      config: { android: { package: 'com.test' } },
    });
    expect(config.android.package).toBe('com.test');
    expect(config.android.config.googleMaps).toBeDefined();
  });

  it('should preserve an array of configured schemes and add the Google redirect scheme', () => {
    process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID =
      'abc123.apps.googleusercontent.com';

    const config = appConfig({
      config: { scheme: ['custom-one', 'custom-two'] },
    });

    expect(config.scheme).toEqual(
      expect.arrayContaining([
        'campusguide',
        'com.concordia.campusguide',
        'custom-one',
        'custom-two',
        'com.googleusercontent.apps.abc123',
      ])
    );
  });

  it('should wrap a single configured scheme into the final scheme array', () => {
    const config = appConfig({
      config: { scheme: 'custom-scheme' },
    });

    expect(config.scheme).toEqual(
      expect.arrayContaining(['campusguide', 'com.concordia.campusguide', 'custom-scheme'])
    );
  });
});
