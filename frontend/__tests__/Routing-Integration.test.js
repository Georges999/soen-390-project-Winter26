import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import * as useDirectionsRouteModule from '../src/hooks/useDirectionsRoute';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
 
  const MockMarker = ({ children, testID, onPress }) => (
    <TouchableOpacity testID={testID} onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
 
  const MockPolyline = ({ testID }) => (
    <View testID={testID} />
  );
 
  const MockMapView = ({ children, testID }) => (
    <View testID={testID}>{children}</View>
  );
 
  return {
    __esModule: true,
    default: MockMapView,
    MapView: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    Polygon: MockMapView,
    Circle: MockMapView,
  };
});

// Mock - initially with empty coordinates
jest.mock('../src/hooks/useDirectionsRoute', () => ({
  useDirectionsRoute: jest.fn(() => ({
    routeCoords: [],
    routeInfo: null,
    routeOptions: [],
  })),
}));



describe('Walking directions routing integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a walking route polyline when route coordinates are available', async () => {
    // First render: no route coordinates
    const { queryByTestId, rerender } = render(<MapScreen />);
    expect(queryByTestId('route-polyline')).toBeNull();

    // Update the mock to return route coordinates
    useDirectionsRouteModule.useDirectionsRoute.mockReturnValue({
      routeCoords: [
        { latitude: 45.4968, longitude: -73.5788 },
        { latitude: 45.4952, longitude: -73.5779 },
      ],
      routeInfo: {
        durationText: "5 mins",
        distanceText: "300 m",
        steps: [],
      },
      routeOptions: [],
    });

    // Re-render after mock update
    rerender(<MapScreen />);

    // Now the route polyline should be rendered
    await waitFor(() => {
      expect(queryByTestId('route-polyline')).toBeTruthy();
    });
  });
});