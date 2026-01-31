export default ({ config }) => {
  const name = config.name ?? 'Campus Guide';
  const slug = config.slug ?? 'campus-guide';
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    name,
    slug,

    ios: {
      ...config.ios,

      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
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