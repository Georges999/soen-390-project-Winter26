import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../../src/screens/MapScreen';
import * as Speech from 'expo-speech';
import { fetchNearbyPOIs } from '../../src/services/poiService';

jest.mock('../../src/services/poiService', () => ({
  fetchNearbyPOIs: jest.fn(),
  categoryToType: {
    Coffee: 'cafe',
    Food: 'restaurant',
    Study: 'library',
  },
}));

jest.mock('../../src/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    userCoord: { latitude: 45.4973, longitude: -73.5789 },
  }),
}));

jest.mock('../../src/hooks/useDefaultStartMyLocation', () => ({
  useDefaultStartMyLocation: jest.fn(),
}));

jest.mock('../../src/hooks/useDirectionsRoute', () => ({
  useDirectionsRoute: () => ({
    routeCoords: [],
    routeInfo: { steps: [], durationText: '--', distanceText: '' },
    routeOptions: [],
  }),
}));

jest.mock('../../src/hooks/useCurrentBuilding', () => ({
  useCurrentBuilding: () => ({ currentBuilding: null }),
}));

jest.mock('../../src/hooks/useNavigationSteps', () => ({
  useNavigationSteps: () => ({ setCurrentStepIndex: jest.fn() }),
}));

jest.mock('../../src/hooks/useMapRoutingController', () => ({
  useMapRoutingController: () => ({
    isCrossCampusTrip: false,
    directionsMode: 'walking',
    shuttleRouting: null,
    isActiveShuttleTrip: false,
    baseRouteCoords: [],
    baseRouteInfo: { steps: [], durationText: '--', distanceText: '' },
    routeOptions: [],
    shuttleRideInfo: null,
    walkToShuttleCoords: [],
    shuttleRideCoords: [],
    walkFromShuttleCoords: [],
    routeCoords: [],
    routeInfo: { steps: [], durationText: '--', distanceText: '' },
    strategyRouteOptions: [],
    safeRouteCoords: [],
    routeRenderMode: 'walk',
    routeRideSegments: [],
    routeWalkDotCoords: [],
  }),
  useMapRoutingSideEffects: jest.fn(),
  useMapRoutingActions: () => ({
    handleGoPress: jest.fn(),
    handleSimulatePress: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useSimulation', () => ({
  useSimulation: ({ onStart }) => {
    const React = require('react');
    React.useEffect(() => {
      onStart?.();
    }, [onStart]);

    return {
      isSimulating: false,
      simulatedCoord: null,
      stopSim: jest.fn(),
      toggleSim: jest.fn(),
    };
  },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  const MapView = React.forwardRef(({ children, testID, ...rest }, ref) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    }));

    return (
      <Pressable testID={testID || 'map-view'} {...rest}>
        {children}
      </Pressable>
    );
  });

  const Polygon = ({ children, onPress, testID }) => (
    <Pressable testID={testID} onPress={onPress}>
      {children}
    </Pressable>
  );

  const Marker = ({ children, onPress, testID }) => (
    <Pressable testID={testID || 'map-marker'} onPress={onPress}>
      {children}
    </Pressable>
  );

  return {
    __esModule: true,
    default: MapView,
    Polygon,
    Marker,
  };
});

jest.mock('../../src/components/RouteOverlay', () => () => null);
jest.mock('../../src/components/ShuttleModal', () => () => null);

jest.mock('../../src/components/DirectionsPanel', () =>
  function MockDirectionsPanel({ onToggleSpeech }) {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="mock-toggle-speech" onPress={onToggleSpeech}>
        <Text>Toggle speech</Text>
      </Pressable>
    );
  },
);

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

describe('MapScreen uncovered lines tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNearbyPOIs.mockResolvedValue([]);
  });

  it('covers next class prefill branch when building code is found', async () => {
    const route = {
      params: {
        nextClassLocation: 'H 110',
        nextClassSummary: 'SOEN 390',
      },
    };

    const { getByTestId } = render(<MapScreen route={route} />);

    await waitFor(() => {
      expect(getByTestId('start-input').props.value).toBe('My location');
      expect(getByTestId('dest-input').props.value).toBe('H 110');
    });
  });

  it('covers campus toggle onSelect callback path', async () => {
    const { getByText } = render(<MapScreen />);

    fireEvent.press(getByText('Loyola'));

    await waitFor(() => {
      expect(getByText('Loyola')).toBeTruthy();
    });
  });

  it('covers POI empty-state rendering after requesting POIs', async () => {
    const { getByTestId, getByText } = render(<MapScreen />);

    fireEvent.press(getByTestId('poi-button'));

    await waitFor(() => {
      expect(getByText('Show on map')).toBeTruthy();
    });

    fireEvent.press(getByText('Show on map'));

    await waitFor(() => {
      expect(getByText('No nearby POIs found.')).toBeTruthy();
    });
  });

  it('covers directions panel onToggleSpeech callback', async () => {
    const route = {
      params: {
        outdoorRoute: {
          startName: 'Start',
          destName: 'Dest',
          startCoords: { latitude: 45.4973, longitude: -73.5789 },
          destCoords: { latitude: 45.5, longitude: -73.57 },
        },
      },
    };

    const { getByTestId } = render(<MapScreen route={route} />);

    const toggle = await waitFor(() => getByTestId('mock-toggle-speech'));
    fireEvent.press(toggle);

    expect(Speech.stop).toHaveBeenCalledTimes(1);
  });

  it('covers outdoorRoute prefill effect for start and destination fields', async () => {
    const route = {
      params: {
        outdoorRoute: {
          startName: 'Hall Building',
          destName: 'Library Building',
          startCoords: { latitude: 45.497, longitude: -73.579 },
          destCoords: { latitude: 45.499, longitude: -73.577 },
        },
      },
    };

    const { getByTestId } = render(<MapScreen route={route} />);

    await waitFor(() => {
      expect(getByTestId('start-input').props.value).toBe('Hall Building');
      expect(getByTestId('dest-input').props.value).toBe('Library Building');
    });
  });

  it('covers building bottom sheet close and directions callbacks', async () => {
    const { getByTestId, getByText, queryByText } = render(<MapScreen />);

    fireEvent.press(getByTestId('building-sgw-b'));

    await waitFor(() => {
      expect(getByText('Directions')).toBeTruthy();
    });

    fireEvent.press(getByText('Directions'));

    await waitFor(() => {
      expect(getByTestId('dest-input').props.value).toBe('B Annex');
    });

    fireEvent.press(getByText('✕'));

    await waitFor(() => {
      expect(queryByText('Directions')).toBeNull();
    });
  });
});
