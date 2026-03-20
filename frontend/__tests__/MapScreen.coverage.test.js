import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import { fetchNearbyPOIs } from '../src/services/poiService';
import * as geoUtils from '../src/utils/geoUtils';
import * as locationService from '../src/services/locationService';
import * as routeStrategy from '../src/routing/routeStrategy';
import * as shuttleUtils from '../src/utils/shuttleUtils';

const mockUseDirectionsRoute = jest.fn();

jest.mock('../src/hooks/useDirectionsRoute', () => ({
  useDirectionsRoute: (...args) => mockUseDirectionsRoute(...args),
}));

jest.mock('../src/hooks/useUserLocation', () => ({
  useUserLocation: ({ setHasLocationPerm }) => {
    const React = require('react');
    React.useEffect(() => {
      setHasLocationPerm(true);
    }, [setHasLocationPerm]);

    return {
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
    };
  },
}));

jest.mock('../src/services/poiService', () => ({
  fetchNearbyPOIs: jest.fn(),
  categoryToType: {
    Coffee: 'cafe',
    Food: 'restaurant',
    Study: 'library',
  },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  const animateToRegionMock = jest.fn();
  const fitToCoordinatesMock = jest.fn();

  const MapView = React.forwardRef(({ children, onPress, testID, ...rest }, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: animateToRegionMock,
      fitToCoordinates: fitToCoordinatesMock,
    }));

    return (
      <Pressable testID={testID || 'map-view'} onPress={onPress} {...rest}>
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
    <Pressable testID={testID || (onPress ? 'poi-marker' : 'map-marker')} onPress={onPress}>
      {children}
    </Pressable>
  );

  const Polyline = ({ children, testID }) => (
    <Pressable testID={testID || 'polyline'}>{children}</Pressable>
  );

  const Circle = ({ children, testID }) => (
    <Pressable testID={testID || 'circle'}>{children}</Pressable>
  );

  return {
    __esModule: true,
    default: MapView,
    Polygon,
    Marker,
    Polyline,
    Circle,
    __mapMocks: {
      animateToRegionMock,
      fitToCoordinatesMock,
    },
  };
});

import { __mapMocks } from 'react-native-maps';

describe('MapScreen coverage-focused interactions', () => {
  const setupShuttleMode = async (utils) => {
    const { getByTestId, getByText } = utils;
    fireEvent(getByTestId('start-input'), 'focus');
    fireEvent.press(getByTestId('building-sgw-b'));
    fireEvent(getByTestId('dest-input'), 'focus');
    fireEvent.changeText(getByTestId('dest-input'), 'Administration');
    await waitFor(() => expect(getByText('Administration Building')).toBeTruthy());
    fireEvent.press(getByText('Administration Building'));
    await waitFor(() => expect(getByText('Transit')).toBeTruthy());
    fireEvent.press(getByText('Transit'));
    fireEvent.press(getByText('Shuttle'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDirectionsRoute.mockImplementation(() => ({
      routeCoords: [],
      routeInfo: { steps: [], durationText: '--', distanceText: '' },
      routeOptions: [],
    }));
    fetchNearbyPOIs.mockResolvedValue([]);
  });

  it('covers building polygon press branch', async () => {
    // Branch: onPress={() => handleBuildingPress(building)} with no active field.
    const { getByTestId, getByText } = render(<MapScreen />);

    fireEvent.press(getByTestId('building-sgw-b'));

    await waitFor(() => {
      expect(getByText('Directions')).toBeTruthy();
      expect(getByText('Amenities')).toBeTruthy();
    });
  });

  it('covers recenter button routeCoords branch', async () => {
    // Branch: routeCoords.length > 0 ? routeCoords[0] : userCoord.
    mockUseDirectionsRoute.mockImplementation(() => ({
      routeCoords: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.58 },
      ],
      routeInfo: { steps: [], durationText: '5 mins', distanceText: '400 m' },
      routeOptions: [],
    }));

    const { getByTestId } = render(<MapScreen />);

    const recenterButton = await waitFor(() => getByTestId('recenter-button'));
    fireEvent.press(recenterButton);

    expect(__mapMocks.animateToRegionMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 45.497, longitude: -73.579 }),
      500,
    );
  });

  it('covers recenter button userCoord fallback branch', async () => {
    // Branch: routeCoords.length === 0 fallback to userCoord.
    const { getByTestId } = render(<MapScreen />);

    const recenterButton = await waitFor(() => getByTestId('recenter-button'));
    fireEvent.press(recenterButton);

    expect(__mapMocks.animateToRegionMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 45.4973, longitude: -73.5789 }),
      500,
    );
  });

  it('covers POI marker press branch', async () => {
    // Branch: onPress={() => setSelectedPOI(poi)} and selectedPOI effect updates destination.
    fetchNearbyPOIs.mockResolvedValueOnce([
      {
        id: 'poi-1',
        name: 'Coffee Spot',
        coords: { latitude: 45.5, longitude: -73.5 },
        address: '123 Main St',
      },
    ]);

    const { getByTestId, getByText, queryByText, getAllByTestId, getAllByText, queryByTestId } = render(<MapScreen />);

    fireEvent.press(getByTestId('poi-button'));

    await waitFor(() => {
      expect(queryByText('Loading nearby places...')).toBeFalsy();
      expect(getByText('Coffee Spot')).toBeTruthy();
    });

    fireEvent.press(getAllByTestId('poi-marker')[0]);

    await waitFor(() => {
      expect(getByTestId('dest-input').props.value).toBe('Coffee Spot');
    });

    fireEvent.press(getAllByText('close')[0]);

    await waitFor(() => {
      expect(queryByTestId('poi-panel')).toBeNull();
    });
  });

  it('covers showCampusLabels=true and campus labels rendering', async () => {
    // Branch: showCampusLabels is true when latitudeDelta > 0.02.
    const { getByTestId, queryAllByText } = render(<MapScreen />);

    fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', {
      latitude: 45.497,
      longitude: -73.579,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });

    await waitFor(() => {
      const campusLabels = [
        ...queryAllByText('SGW'),
        ...queryAllByText('Loyola'),
      ];
      expect(campusLabels.length).toBeGreaterThan(0);
    });
  });

  it('covers !showCampusLabels && center && label by rendering building label', async () => {
    // Branch: zoomed-in map (showCampusLabels=false) and truthy center+label -> building label marker rendered.
    const centerSpy = jest
      .spyOn(geoUtils, 'getPolygonCenter')
      .mockReturnValue({ latitude: 45.497, longitude: -73.579 });

    const { getByTestId, getByText } = render(<MapScreen />);

    fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', {
      latitude: 45.497,
      longitude: -73.579,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    });

    await waitFor(() => {
      expect(getByText('B')).toBeTruthy();
    });

    centerSpy.mockRestore();
  });

  it('covers POI panel close button branch (line 920)', async () => {
    // Branch: POI panel header close button onPress={() => setIsPOIPanelOpen(false)}.
    const { getByTestId, queryByTestId, getAllByText } = render(<MapScreen />);

    fireEvent.press(getByTestId('poi-button'));

    await waitFor(() => {
      expect(getByTestId('poi-panel')).toBeTruthy();
    });

    fireEvent.press(getAllByText('close')[0]);

    await waitFor(() => {
      expect(queryByTestId('poi-panel')).toBeNull();
    });
  });

  it('covers POI result-row press branch (line 994)', async () => {
    // Branch: Pressable row onPress={() => setSelectedPOI(poi)} inside POI panel list.
    fetchNearbyPOIs.mockResolvedValueOnce([
      {
        id: 'poi-row-1',
        name: 'Library POI',
        coords: { latitude: 45.501, longitude: -73.57 },
        address: '123 Test St',
      },
    ]);

    const { getByTestId, getByText } = render(<MapScreen />);

    fireEvent.press(getByTestId('poi-button'));

    await waitFor(() => {
      expect(getByText('Library POI')).toBeTruthy();
    });

    fireEvent.press(getByText('Library POI'));

    await waitFor(() => {
      expect(getByTestId('dest-input').props.value).toBe('Library POI');
    });
  });

  it('covers My location destination branch', async () => {
    jest.spyOn(locationService, 'getUserCoords').mockResolvedValue({ latitude: 45.5, longitude: -73.5 });
    const { getByTestId, getByText } = render(<MapScreen />);
    fireEvent(getByTestId('dest-input'), 'focus');
    fireEvent.changeText(getByTestId('dest-input'), 'my');
    fireEvent.press(getByText('My location'));
    await waitFor(() => expect(getByTestId('dest-input').props.value).toBe('My location'));
  });

  it('covers shuttle modal close toggle branch', async () => {
    const utils = render(<MapScreen />);
    const { getByText, queryByText, getAllByText } = utils;
    await setupShuttleMode(utils);
    await waitFor(() => expect(getByText('Concordia Shuttle')).toBeTruthy());
    fireEvent.press(getAllByText('X')[getAllByText('X').length - 1]);
    await waitFor(() => expect(queryByText('Concordia Shuttle')).toBeNull());
  });

  it('covers other-campus label conditional render branch', async () => {
    const centerSpy = jest.spyOn(geoUtils, 'getPolygonCenter').mockReturnValue({ latitude: 45.49, longitude: -73.58 });
    const { getByTestId, getByText } = render(<MapScreen />);
    fireEvent(getByTestId('map-view'), 'onRegionChangeComplete', { latitude: 45.49, longitude: -73.58, latitudeDelta: 0.003, longitudeDelta: 0.003 });
    await waitFor(() => expect(getByText('AD')).toBeTruthy());
    centerSpy.mockRestore();
  });

  it('covers shuttle auto-fit effect branch (line 604)', async () => {
    const routeSpy = jest.spyOn(routeStrategy, 'getRoute').mockReturnValue({ routeCoords: [{ latitude: 45.49, longitude: -73.58 }, { latitude: 45.5, longitude: -73.57 }], routeInfo: {}, routeOptions: [], render: { mode: 'solid', rideSegments: [], walkDotCoords: [] } });
    const shuttleSpy = jest.spyOn(shuttleUtils, 'getShuttleDepartures').mockReturnValue({ active: true, times: [] });
    const utils = render(<MapScreen />);
    await setupShuttleMode(utils);
    await waitFor(() => expect(__mapMocks.fitToCoordinatesMock).toHaveBeenCalled()); routeSpy.mockRestore(); shuttleSpy.mockRestore();
  });
});
