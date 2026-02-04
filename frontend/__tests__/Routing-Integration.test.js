import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';

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
  };
});

describe('Walking directions routing integration', () => {
  it('renders a walking route polyline after selecting start and destination', async () => {
    // Render the full screen
    const { getByTestId, queryByTestId } = render(<MapScreen />);
   
    // Before: no route drawn yet
    expect(queryByTestId('route-polyline')).toBeNull();
   
    // Get the building markers
    const buildingH = getByTestId('building-sgw-h');
    const buildingEV = getByTestId('building-sgw-ev');
   
    // Simulate the user tapping the buildings
    fireEvent.press(buildingH);
    fireEvent.press(buildingEV);
   
    // Wait for the route to appear
    await waitFor(() => {
      expect(getByTestId('route-polyline')).toBeTruthy();
    });
  });
});