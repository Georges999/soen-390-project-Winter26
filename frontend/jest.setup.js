import { jest } from '@jest/globals';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  class MockMapView extends React.Component {
    // This allows the test to spy on the call
    static animateToRegion = jest.fn();
    static fitToCoordinates = jest.fn();
    animateToRegion = (...args) => MockMapView.animateToRegion(...args);
    fitToCoordinates = (...args) => MockMapView.fitToCoordinates(...args);

    render() {
      return <View {...this.props}>{this.props.children}</View>;
    }
  }

  return {
    __esModule: true,
    default: MockMapView,

    // Geometry
    Polygon: (props) => <View {...props}>{props.children}</View>,
    Polyline: (props) => <View {...props}>{props.children}</View>,
    Circle: (props) => <View {...props}>{props.children}</View>,

    // Markers / labels / callouts
    Marker: (props) => <View {...props}>{props.children}</View>,
    Callout: (props) => <View {...props}>{props.children}</View>,
  };
});

// Mock expo-speech to prevent errors during testing
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}), { virtual: true });


// Mock expo-vector-icons virtually
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: ({ name, ...rest }) => <Text {...rest}>{name}</Text>,
    Ionicons: ({ name, ...rest }) => <Text {...rest}>{name}</Text>,
    FontAwesome5: ({ name, ...rest }) => <Text {...rest}>{name}</Text>,
  };
}, { virtual: true });

jest.mock('expo-location', () => ({
  // Define the Enum first
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  // Define the functions
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 45.4973,
        longitude: -73.5790,
        accuracy: 10,
        altitude: 0,
        heading: 0,
        speed: 0,
      },
    })
  ),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
}));

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    codeVerifier: 'test_verifier',
    promptAsync: jest.fn().mockResolvedValue({ type: 'success', params: { code: 'test_code' } }),
  })),
  ResponseType: { Code: 'code' },
  exchangeCodeAsync: jest.fn().mockResolvedValue({
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    expiresIn: 3600,
  }),
  refreshAsync: jest.fn().mockResolvedValue({
    accessToken: 'refreshed_access_token',
    expiresIn: 3600,
  }),
}), { virtual: true });

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}), { virtual: true });

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });