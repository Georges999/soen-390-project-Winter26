export default ({ config }) => {
  const name = config.name ?? 'Campus Guide';
  const slug = config.slug ?? 'campus-guide';
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID ?? '';
  const configuredScheme = config.scheme;
  const googleClientPrefix = googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '');
  const googleIosRedirectScheme = googleClientPrefix
    ? `com.googleusercontent.apps.${googleClientPrefix}`
    : null;
  let configuredSchemes = [];
  if (Array.isArray(configuredScheme)) {
    configuredSchemes = configuredScheme;
  } else if (configuredScheme) {
    configuredSchemes = [configuredScheme];
  }
  const scheme = Array.from(
    new Set(
      [
        'campusguide',
        'com.concordia.campusguide',
        googleIosRedirectScheme,
        ...configuredSchemes,
      ].filter(Boolean)
    )
  );

  return {
    ...config,
    name,
    slug,
    scheme,

    ios: {
      ...config.ios,

      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription:
          'We use your location to show where you are on campus.',
      },

      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },

    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
