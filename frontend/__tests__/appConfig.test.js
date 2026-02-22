import appConfig from '../app.config';

describe('app.config.js', () => {
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
});
