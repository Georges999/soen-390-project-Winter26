import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import MapView from 'react-native-maps';
import campuses from '../src/data/campuses.json';

describe('MapScreen Campus Toggle', () => {
  it('should move the map to Loyola coordinates when Loyola is pressed', async () => {
    // Render the full screen
    const { getByText } = render(<MapScreen />);

    
    const loyolaButton = getByText('Loyola');

    // Simulate the user tapping the button
    fireEvent.press(loyolaButton);

    // Wait for the useEffect to trigger the animation
    await waitFor(() => {
      expect(MapView.animateToRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: campuses.loyola.region.latitude,
          longitude: campuses.loyola.region.longitude,
        }),
        600 
      );
    });
  });
});