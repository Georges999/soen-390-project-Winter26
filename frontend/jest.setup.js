import { jest } from '@jest/globals';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  class MockMapView extends React.Component {
    // This allows the test to spy on the call
    static animateToRegion = jest.fn();
    animateToRegion = (...args) => MockMapView.animateToRegion(...args);

    render() {
      return <View {...this.props}>{this.props.children}</View>;
    }
  }

  return {
    __esModule: true,
    default: MockMapView,
    Polygon: (props) => <View {...props} />,
    Polyline: (props) => <View {...props} />,
  };
});

// Mock expo-speech to prevent errors during testing
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// Mock expo-vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock expo-vector-icons virtually
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: (props) => <Text {...props} />,
    Ionicons: (props) => <Text {...props} />,
   
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
}));